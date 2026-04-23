using HospitalBilling.Data;
using HospitalBilling.DTOs;
using HospitalBilling.Enums;
using HospitalBilling.Helpers;
using HospitalBilling.Models;
using HospitalBilling.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Services
{
    public class BillingService : IBillingService
    {
        private readonly AppDbContext _db;

        public BillingService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<BillDto>> GetBillsForDoctorAsync(int doctorId)
        {
            // Bills where the doctor added items OR created the bill
            var billIds = await _db.BillItems
                .Where(i => i.AddedByStaffId == doctorId)
                .Select(i => i.BillId)
                .ToListAsync();

            var bills = await _db.Bills
                .Where(b => (billIds.Contains(b.Id) || b.CreatedByStaffId == doctorId || b.AssignedDoctorId == doctorId) && b.Status != BillStatus.Trash)
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => MapToDto(b, b.Patient?.FullName ?? "Unknown Patient")).ToList();
        }

        public async Task<BillDto> CreateBillAsync(CreateBillDto dto, int createdByStaffId)
        {
            var patient = await _db.Patients.FindAsync(dto.PatientId)
                ?? throw new KeyNotFoundException("Patient not found.");

            var bill = new Bill
            {
                PatientId = dto.PatientId,
                BillNumber = GenerateBillNumber(),
                CreatedByStaffId = createdByStaffId,
                Urgency = dto.Urgency,
                AssignedDoctorId = dto.AssignedDoctorId
            };

            _db.Bills.Add(bill);
            await _db.SaveChangesAsync();

            return MapToDto(bill, patient.FullName);
        }

        public async Task<BillItemDto> AddBillItemAsync(AddBillItemDto dto, int staffId, StaffRole staffRole)
        {
            var bill = await _db.Bills.Include(b => b.Patient).FirstOrDefaultAsync(b => b.Id == dto.BillId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Cannot add items to a bill that is not Open.");

            // Validate category is allowed for this role
            ValidateCategoryForRole(dto.Category, staffRole);

            // AUTOMATIC PRICING: Prioritize checking DB for exact service description match
            decimal price = dto.UnitPrice;
            
            var exactService = await _db.ServiceCategories.FirstOrDefaultAsync(sc => sc.Name == dto.Description && sc.IsActive);
            if (exactService != null && exactService.BasePrice > 0)
            {
                price = exactService.BasePrice;
            }
            else if (price <= 0 || staffRole == StaffRole.Doctor)
            {
                price = PricingHelper.GetStandardRate(dto.Category, _db);
            }

            var item = new BillItem
            {
                BillId = dto.BillId,
                AddedByStaffId = staffId,
                Category = dto.Category,
                Description = dto.Description,
                UnitPrice = price,
                Quantity = dto.Quantity,
                Notes = dto.Notes,
                InsuranceCoveragePercentage = Math.Clamp(bill.Patient.InsuranceCoveragePercentage, 0, 100),
                // These categories are billable only after fulfillment by the responsible department.
                IsCompleted = dto.Category != BillItemCategory.LabTest
                    && dto.Category != BillItemCategory.Medication
                    && dto.Category != BillItemCategory.NursingService
                    && dto.Category != BillItemCategory.BedCharge
                    && dto.Category != BillItemCategory.Consumable
            };

            _db.BillItems.Add(item);
            await _db.SaveChangesAsync();

            await _db.Entry(item).Reference(i => i.AddedByStaff).LoadAsync();

            return MapItemToDto(item);
        }

        public async Task RemoveBillItemAsync(int billItemId, int staffId, StaffRole staffRole)
        {
            var item = await _db.BillItems.Include(i => i.Bill)
                .FirstOrDefaultAsync(i => i.Id == billItemId)
                ?? throw new KeyNotFoundException("Bill item not found.");

            if (item.Bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Cannot remove items from a finalized bill.");

            if (item.AddedByStaffId != staffId && staffRole != StaffRole.Cashier && staffRole != StaffRole.Admin)
                throw new UnauthorizedAccessException("You can only remove items you added yourself, unless you are a cashier or admin.");

            _db.BillItems.Remove(item);
            await _db.SaveChangesAsync();
        }

        public async Task MarkTestCompletedAsync(int billItemId, int staffId, string? resultNotes = null)
        {
            var item = await _db.BillItems
                .Include(i => i.AddedByStaff)
                .FirstOrDefaultAsync(i => i.Id == billItemId)
                ?? throw new KeyNotFoundException("Bill item not found.");

            if (item.Category != BillItemCategory.LabTest)
                throw new InvalidOperationException("Only lab tests can be marked as completed.");

            item.IsCompleted = true;
            item.CompletedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(resultNotes))
            {
                item.Notes = resultNotes;
            }
            item.CompletedByStaffId = staffId;
            await _db.SaveChangesAsync();
        }

        public async Task RevertTestCompletedAsync(int billItemId, int staffId)
        {
            var item = await _db.BillItems
                .Include(i => i.Bill)
                .FirstOrDefaultAsync(i => i.Id == billItemId)
                ?? throw new KeyNotFoundException("Bill item not found.");

            if (item.Bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Cannot revert tests on a finalized bill.");

            if (item.Category != BillItemCategory.LabTest)
                throw new InvalidOperationException("Only lab tests can be reverted.");

            item.IsCompleted = false;
            item.CompletedAt = null;
            item.CompletedByStaffId = null;
            // Optionally clear out the result notes since it's going back to pending
            item.Notes = null; 
            await _db.SaveChangesAsync();
        }

        public async Task DispenseMedicationAsync(int billItemId, int staffId, int quantity)
        {
            var item = await _db.BillItems
                .Include(i => i.Bill)
                .FirstOrDefaultAsync(i => i.Id == billItemId)
                ?? throw new KeyNotFoundException("Medication order not found.");

            if (item.Category != BillItemCategory.Medication)
                throw new InvalidOperationException("Only items in the Medication category can be dispensed via pharmacy.");

            if (item.Bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Cannot dispense items for a finalized bill.");

            // Stock Management
            var category = await _db.ServiceCategories.FirstOrDefaultAsync(c => c.Name == item.Description);
            if (category != null && category.StockQuantity.HasValue)
            {
                if (category.StockQuantity < quantity)
                    throw new InvalidOperationException($"Insufficient stock for {item.Description}. Available: {category.StockQuantity}");
                
                category.StockQuantity -= quantity;
            }

            item.Quantity = quantity;
            item.IsCompleted = true;
            item.CompletedAt = DateTime.UtcNow;
            item.CompletedByStaffId = staffId;
            await _db.SaveChangesAsync();
        }

        public async Task CompleteNursingOrderAsync(int billItemId, int staffId, int quantity, string? notes = null)
        {
            var item = await _db.BillItems
                .Include(i => i.Bill)
                .Include(i => i.AddedByStaff)
                .FirstOrDefaultAsync(i => i.Id == billItemId)
                ?? throw new KeyNotFoundException("Nursing order not found.");

            if (item.Bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Cannot complete nursing orders for a finalized bill.");

            if (item.Category != BillItemCategory.NursingService
                && item.Category != BillItemCategory.BedCharge
                && item.Category != BillItemCategory.Consumable)
                throw new InvalidOperationException("Only nursing categories can be completed by nurse workflow.");

            // Allow nurses to complete tasks, including ones they added themselves (e.g. consumables)

            if (quantity <= 0)
                throw new InvalidOperationException("Quantity must be at least 1.");

            item.Quantity = quantity;
            item.IsCompleted = true;
            item.CompletedAt = DateTime.UtcNow;
            item.CompletedByStaffId = staffId;

            if (!string.IsNullOrWhiteSpace(notes))
            {
                item.Notes = notes.Trim();
            }

            await _db.SaveChangesAsync();
        }

        public async Task<BillDto> FinalizeBillAsync(int billId, int staffId)
        {
            var bill = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == billId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Open)
                throw new InvalidOperationException("Only Open bills can be finalized.");

            var pendingCount = bill.Items.Count(i => !i.IsCompleted);
            var pendingRxCount = await _db.Prescriptions.CountAsync(p => p.BillId == billId && p.Status == 0);

            if (pendingCount > 0 || pendingRxCount > 0)
            {
                var msg = pendingCount > 0 
                    ? $"There are {pendingCount} pending items (Lab/Pharm/Nursing)" 
                    : "";
                if (pendingRxCount > 0) 
                    msg += (msg != "" ? " and " : "") + $"{pendingRxCount} pending prescriptions";
                
                throw new InvalidOperationException($"Cannot finalize bill. {msg} that must be completed/dispensed first.");
            }

            bill.Status = BillStatus.Finalized;
            bill.FinalizedAt = DateTime.UtcNow;
            bill.FinalizedByStaffId = staffId;

            await _db.SaveChangesAsync();

            return MapToDto(bill, bill.Patient?.FullName ?? "Unknown Patient");
        }

        public async Task<BillDto?> GetBillByIdAsync(int billId)
        {
            var bill = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == billId);

            return bill == null ? null : MapToDto(bill, bill.Patient?.FullName ?? "Unknown Patient");
        }

        public async Task<BillDto?> GetBillByIdentifierAsync(string billNumber)
        {
            var bill = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.BillNumber == billNumber);

            return bill == null ? null : MapToDto(bill, bill.Patient?.FullName ?? "Unknown Patient");
        }

        public async Task<List<BillDto>> GetBillsByPhoneAsync(string phoneNumber)
        {
            // Normalize phone number to last 9 digits for robust matching
            var normalizedPhone = phoneNumber.Length >= 9 ? phoneNumber.Substring(phoneNumber.Length - 9) : phoneNumber;

            // Find all patient records with matching phone number suffix
            var patientIds = await _db.Patients
                .Where(p => p.PhoneNumber.EndsWith(normalizedPhone))
                .Select(p => p.Id)
                .ToListAsync();

            var bills = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .Where(b => patientIds.Contains(b.PatientId) && b.Status != BillStatus.Trash)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => MapToDto(b, b.Patient?.FullName ?? "Unknown Patient")).ToList();
        }

        public async Task<List<BillDto>> GetAllBillsAsync(int staffId, StaffRole staffRole)
        {
            var query = _db.Bills.AsQueryable();

            // DATA ISOLATION LOGIC
            if (staffRole == StaffRole.Doctor)
            {
                // Doctors see their assigned bills, bills they created, or bills where they added items/prescriptions
                var billIdsByItems = await _db.BillItems
                    .Where(i => i.AddedByStaffId == staffId)
                    .Select(i => i.BillId)
                    .Distinct()
                    .ToListAsync();

                var billIdsByPrescriptions = await _db.Prescriptions
                    .Where(p => p.PrescribedByStaffId == staffId)
                    .Select(p => p.BillId)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(b => 
                    (billIdsByItems.Contains(b.Id) || billIdsByPrescriptions.Contains(b.Id) || b.CreatedByStaffId == staffId || b.AssignedDoctorId == staffId) 
                    && b.Status != BillStatus.Trash);
            }
            else if (staffRole == StaffRole.Nurse)
            {
                // Nurses see bills with nursing items (only pending ones, or completed by them)
                var nursingBillIds = await _db.BillItems
                    .Where(i => (i.Category == BillItemCategory.NursingService || i.Category == BillItemCategory.BedCharge || i.Category == BillItemCategory.Consumable)
                                && (!i.IsCompleted || i.CompletedByStaffId == staffId))
                    .Select(i => i.BillId)
                    .Distinct()
                    .ToListAsync();
                
                query = query.Where(b => nursingBillIds.Contains(b.Id) && b.Status != BillStatus.Trash);
            }
            else if (staffRole == StaffRole.LabTech)
            {
                // LabTechs see bills with lab items (only pending ones, or completed by them)
                var labBillIds = await _db.BillItems
                    .Where(i => (i.Category == BillItemCategory.LabTest || i.Category == BillItemCategory.PrescribedTest)
                                && (!i.IsCompleted || i.CompletedByStaffId == staffId))
                    .Select(i => i.BillId)
                    .Distinct()
                    .ToListAsync();
                
                query = query.Where(b => labBillIds.Contains(b.Id) && b.Status != BillStatus.Trash);
            }
            else if (staffRole == StaffRole.Pharmacist)
            {
                // Pharmacists see bills with medication items OR prescriptions (only pending ones, or completed by them)
                var pharmBillIds = await _db.BillItems
                    .Where(i => i.Category == BillItemCategory.Medication && (!i.IsCompleted || i.CompletedByStaffId == staffId))
                    .Select(i => i.BillId)
                    .Distinct()
                    .ToListAsync();
                
                var rxBillIds = await _db.Prescriptions
                    .Where(p => p.Status == 0 || p.DispensedByStaffId == staffId)
                    .Select(p => p.BillId)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(b => (pharmBillIds.Contains(b.Id) || rxBillIds.Contains(b.Id)) && b.Status != BillStatus.Trash);
            }
            else if (staffRole == StaffRole.Receptionist)
            {
                // Receptionists only see visits they created
                query = query.Where(b => b.CreatedByStaffId == staffId);
            }
            // Admin and Cashier see all (no filter)

            var bills = await query
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => MapToDto(b, b.Patient?.FullName ?? "Unknown Patient")).ToList();
        }

        public async Task DeleteBillAsync(int billId, int staffId, StaffRole staffRole)
        {
            var bill = await _db.Bills
                .FirstOrDefaultAsync(b => b.Id == billId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Open && staffRole != StaffRole.Cashier && staffRole != StaffRole.Admin)
                throw new InvalidOperationException("Doctors can only move Open visits to trash.");

            if (bill.CreatedByStaffId != staffId && staffRole != StaffRole.Cashier && staffRole != StaffRole.Admin)
                throw new UnauthorizedAccessException("You can only delete visits you created.");

            bill.Status = BillStatus.Trash;
            await _db.SaveChangesAsync();
        }

        public async Task<List<BillDto>> GetTrashBillsForDoctorAsync(int doctorId)
        {
            var bills = await _db.Bills
                .Where(b => (b.CreatedByStaffId == doctorId || b.AssignedDoctorId == doctorId) && b.Status == BillStatus.Trash)
                .Include(b => b.Patient)
                .Include(b => b.AssignedDoctor)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => MapToDto(b, b.Patient?.FullName ?? "Unknown Patient")).ToList();
        }

        public async Task RestoreBillAsync(int billId, int staffId)
        {
            var bill = await _db.Bills.FindAsync(billId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.CreatedByStaffId != staffId)
                throw new UnauthorizedAccessException("You can only restore visits you created.");

            bill.Status = BillStatus.Open;
            await _db.SaveChangesAsync();
        }

        public async Task PermanentlyDeleteBillAsync(int billId, int staffId, StaffRole staffRole)
        {
            var bill = await _db.Bills
                .Include(b => b.Items)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == billId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.CreatedByStaffId != staffId && staffRole != StaffRole.Cashier && staffRole != StaffRole.Admin)
                throw new UnauthorizedAccessException("You can only permanently delete visits you created.");

            _db.BillItems.RemoveRange(bill.Items);
            _db.Payments.RemoveRange(bill.Payments);
            _db.Bills.Remove(bill);

            await _db.SaveChangesAsync();
        }

        public async Task RaiseItemDisputeAsync(int billItemId, string reason)
        {
            var item = await _db.BillItems.FindAsync(billItemId)
                ?? throw new KeyNotFoundException("Item not found.");

            item.IsDisputed = true;

            var dispute = new Dispute
            {
                BillId = item.BillId,
                BillItemId = billItemId,
                Reason = reason,
                Status = DisputeStatus.Open
            };

            _db.Disputes.Add(dispute);
            await _db.SaveChangesAsync();
        }

        public async Task ResolveItemDisputeAsync(int disputeId, int staffId, bool approveDispute, string notes)
        {
            var dispute = await _db.Disputes
                .Include(d => d.BillItem)
                .FirstOrDefaultAsync(d => d.Id == disputeId)
                ?? throw new KeyNotFoundException("Dispute not found.");

            dispute.Status = approveDispute ? DisputeStatus.Resolved : DisputeStatus.Rejected;
            dispute.ResolvedAt = DateTime.UtcNow;
            dispute.ResolvedByStaffId = staffId;
            dispute.ResolutionNotes = notes;

            if (dispute.BillItem != null)
            {
                if (approveDispute)
                {
                    // If approved, item is removed or stays "Disputed" (already excluded from total)
                    // If it was a medication, we might want to return stock?
                    if (dispute.BillItem.Category == BillItemCategory.Medication)
                    {
                        var category = await _db.ServiceCategories.FirstOrDefaultAsync(c => c.Name == dispute.BillItem.Description);
                        if (category != null && category.StockQuantity.HasValue)
                        {
                            category.StockQuantity += dispute.BillItem.Quantity;
                        }
                    }
                    _db.BillItems.Remove(dispute.BillItem);
                }
                else
                {
                    // If rejected, item is active again
                    dispute.BillItem.IsDisputed = false;
                }
            }

            await _db.SaveChangesAsync();
        }

        public async Task<List<Dispute>> GetAllDisputesAsync()
        {
            return await _db.Disputes
                .Include(d => d.Bill)
                .Include(d => d.BillItem)
                .OrderByDescending(d => d.RaisedAt)
                .ToListAsync();
        }

        public async Task UpdateAssignedDoctorAsync(int billId, int? doctorId)
        {
            var bill = await _db.Bills.FindAsync(billId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Open)
                throw new InvalidOperationException($"Can only change assigned doctor for Open visits. Current bill status is: {bill.Status}");

            bill.AssignedDoctorId = doctorId;
            await _db.SaveChangesAsync();
        }
        
        // --- Prescriptions ---

        public async Task<PrescriptionDto> CreatePrescriptionAsync(HospitalBilling.DTOs.CreatePrescriptionDto dto, int staffId)
        {
            var bill = await _db.Bills.Include(b => b.Patient).FirstOrDefaultAsync(b => b.Id == dto.BillId) 
                ?? throw new KeyNotFoundException("Bill not found");
            
            var prescription = new Prescription
            {
                BillId = dto.BillId,
                DrugName = dto.DrugName,
                Dosage = dto.Dosage,
                Frequency = dto.Frequency,
                Duration = dto.Duration,
                Status = 0,
                PrescribedByStaffId = staffId,
                PrescribedAt = DateTime.UtcNow
            };
            _db.Prescriptions.Add(prescription);
            await _db.SaveChangesAsync();
            
            return MapToPrescriptionDto(prescription, bill.BillNumber, bill.Patient?.FullName);
        }

        public async Task<List<PrescriptionDto>> GetPrescriptionsForBillAsync(int billId)
        {
            var prescriptions = await _db.Prescriptions
                .Include(p => p.Bill)
                .ThenInclude(b => b.Patient)
                .Include(p => p.PrescribedByStaff)
                .Where(p => p.BillId == billId)
                .OrderByDescending(p => p.PrescribedAt)
                .ToListAsync();

            return prescriptions.Select(p => MapToPrescriptionDto(p, p.Bill?.BillNumber, p.Bill?.Patient?.FullName)).ToList();
        }

        public async Task<List<PrescriptionDto>> GetPendingPrescriptionsAsync()
        {
            var prescriptions = await _db.Prescriptions
                .Include(p => p.Bill)
                .ThenInclude(b => b.Patient)
                .Include(p => p.PrescribedByStaff)
                .Where(p => p.Status == 0)
                .OrderBy(p => p.PrescribedAt)
                .ToListAsync();

            return prescriptions.Select(p => MapToPrescriptionDto(p, p.Bill?.BillNumber, p.Bill?.Patient?.FullName)).ToList();
        }

        public async Task<BillItemDto> DispensePrescriptionAsync(int prescriptionId, int staffId, HospitalBilling.DTOs.DispensePrescriptionDto dto)
        {
            var prescription = await _db.Prescriptions
                .Include(p => p.Bill)
                .ThenInclude(b => b.Patient)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId) 
                ?? throw new KeyNotFoundException("Prescription not found");

            if (prescription.Status != 0)
                throw new InvalidOperationException("Prescription is already dispensed or cancelled.");

            var category = await _db.ServiceCategories.FindAsync(dto.ServiceCategoryId) 
                ?? throw new KeyNotFoundException("Service category (drug) not found");

            var billItem = new BillItem
            {
                BillId = prescription.BillId,
                Category = BillItemCategory.Medication,
                Description = category.Name,
                UnitPrice = category.BasePrice,
                Quantity = dto.Quantity,
                InsuranceCoveragePercentage = prescription.Bill.Patient.InsuranceCoveragePercentage,
                AddedByStaffId = staffId,
                AddedAt = DateTime.UtcNow,
                IsCompleted = true, // Dispensed immediately
                CompletedAt = DateTime.UtcNow,
                CompletedByStaffId = staffId,
                Notes = $"Dispensed for Rx: {prescription.DrugName} {prescription.Dosage}"
            };

            _db.BillItems.Add(billItem);
            
            prescription.Status = 1;
            prescription.DispensedByStaffId = staffId;
            prescription.DispensedAt = DateTime.UtcNow;
            prescription.BillItemId = billItem.Id;

            await _db.SaveChangesAsync();

            await _db.Entry(billItem).Reference(i => i.AddedByStaff).LoadAsync();

            return MapItemToDto(billItem);
        }

        // --- Helpers ---

        private static void ValidateCategoryForRole(BillItemCategory category, StaffRole role)
        {
            var allowed = role switch
            {
                StaffRole.Doctor => new[]
                {
                    BillItemCategory.ConsultationFee,
                    BillItemCategory.Diagnosis,
                    BillItemCategory.PrescribedTest,
                    BillItemCategory.Procedure,
                    BillItemCategory.LabTest,   // Doctor orders test
                    BillItemCategory.Medication, // Doctor orders medication
                    BillItemCategory.BedCharge, // Doctor orders nursing/ward care
                    BillItemCategory.NursingService,
                    BillItemCategory.Consumable
                },
                StaffRole.LabTech => new[]
                {
                    BillItemCategory.LabTest
                },
                StaffRole.Pharmacist => new[]
                {
                    BillItemCategory.Medication
                },
                StaffRole.Nurse => Array.Empty<BillItemCategory>(),
                StaffRole.Cashier => Enum.GetValues<BillItemCategory>(), // full access
                StaffRole.Admin => Enum.GetValues<BillItemCategory>(), // full access
                _ => Array.Empty<BillItemCategory>()
            };

            if (!allowed.Contains(category))
                throw new UnauthorizedAccessException(
                    $"Role '{role}' is not allowed to add items of category '{category}'.");
        }

        private static string GenerateBillNumber()
        {
            return $"BILL-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        }

        private static BillDto MapToDto(Bill bill, string patientName) => new()
        {
            Id = bill.Id,
            PatientId = bill.PatientId,
            BillNumber = bill.BillNumber,
            PatientName = patientName,
            Status = bill.Status.ToString(),
            Urgency = bill.Urgency.ToString(),
            CreatedAt = bill.CreatedAt,
            FinalizedAt = bill.FinalizedAt,
            TotalAmount = bill.TotalAmount,
            TotalInsurance = bill.TotalInsurance,
            PatientLiability = bill.PatientLiability,
            TotalPaid = bill.TotalPaid,
            BalanceDue = bill.BalanceDue,
            AssignedDoctorId = bill.AssignedDoctorId,
            AssignedDoctorName = bill.AssignedDoctor?.FullName,
            Items = bill.Items.Select(MapItemToDto).ToList(),
            Payments = bill.Payments.Select(p => new PaymentResponseDto
            {
                Id = p.Id,
                Amount = p.Amount,
                Method = p.Method,
                IsConfirmed = p.IsConfirmed,
                PaidAt = p.PaidAt,
                Reference = p.Reference
            }).ToList()
        };

        private static BillItemDto MapItemToDto(BillItem item) => new()
        {
            Id = item.Id,
            Category = item.Category.ToString(),
            Description = item.Description,
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity,
            Subtotal = item.GrossAmount,
            CoveragePercentage = item.InsuranceCoveragePercentage,
            InsuranceAmount = item.InsuranceAmount,
            PatientAmount = item.PatientAmount,
            IsCompleted = item.IsCompleted,
            IsDisputed = item.IsDisputed,
            AddedBy = item.AddedByStaff?.FullName ?? "Unknown",
            AddedByRole = item.AddedByStaff?.Role.ToString() ?? "Unknown",
            AddedAt = item.AddedAt,
            CompletedAt = item.CompletedAt,
            CompletedByStaffId = item.CompletedByStaffId,
            Notes = item.Notes
        };

        private static PrescriptionDto MapToPrescriptionDto(Prescription p, string? billNumber, string? patientName) => new()
        {
            Id = p.Id,
            BillId = p.BillId,
            BillNumber = billNumber,
            PatientName = patientName,
            DrugName = p.DrugName,
            Dosage = p.Dosage,
            Frequency = p.Frequency,
            Duration = p.Duration,
            Status = p.Status,
            PrescribedBy = p.PrescribedByStaff?.FullName,
            PrescribedAt = p.PrescribedAt
        };
        public async Task<PatientReportDto> GetPatientReportAsync(int patientId, DateTime start, DateTime end)
        {
            var patient = await _db.Patients.FindAsync(patientId)
                ?? throw new KeyNotFoundException("Patient not found.");

            // Normalize phone number to last 9 digits for robust matching
            var normalizedPhone = patient.PhoneNumber.Length >= 9 ? patient.PhoneNumber.Substring(patient.PhoneNumber.Length - 9) : patient.PhoneNumber;

            // Find all linked patient IDs (same phone suffix or National ID if present)
            var linkedPatientIds = await _db.Patients
                .Where(p => p.PhoneNumber.EndsWith(normalizedPhone) || 
                            (patient.NationalId != null && p.NationalId == patient.NationalId))
                .Select(p => p.Id)
                .ToListAsync();

            // Handle date range: Ensure 'end' includes the full last day
            var adjustedStart = start.Date;
            var adjustedEnd = end.Date.AddDays(1).AddTicks(-1);

            var bills = await _db.Bills
                .Include(b => b.Items)
                .Include(b => b.Payments)
                .Where(b => linkedPatientIds.Contains(b.PatientId) && 
                            b.CreatedAt >= adjustedStart && 
                            b.CreatedAt <= adjustedEnd &&
                            b.Status != BillStatus.Trash)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync();

            var report = new PatientReportDto
            {
                PatientName = patient.FullName,
                StartDate = start,
                EndDate = end,
                VisitCount = bills.Count,
                TotalSpent = bills.Sum(b => b.PatientLiability),
                TotalInsurance = bills.Sum(b => b.TotalInsurance),
                Visits = bills.Select(b => new PatientReportVisitDto
                {
                    BillId = b.Id,
                    BillNumber = b.BillNumber,
                    Date = b.CreatedAt,
                    TotalAmount = b.TotalAmount,
                    InsuranceAmount = b.TotalInsurance,
                    PatientAmount = b.PatientLiability,
                    PaidAmount = b.TotalPaid,
                    Status = b.Status.ToString()
                }).ToList()
            };

            return report;
        }
    }
}
