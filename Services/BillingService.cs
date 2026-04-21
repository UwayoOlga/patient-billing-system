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
                .Where(b => (billIds.Contains(b.Id) || b.CreatedByStaffId == doctorId) && b.Status != BillStatus.Trash)
                .Include(b => b.Patient)
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
                CreatedByStaffId = createdByStaffId
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

            item.Quantity = quantity;
            item.IsCompleted = true;
            item.CompletedAt = DateTime.UtcNow;
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

            if (item.AddedByStaff.Role != StaffRole.Doctor)
                throw new InvalidOperationException("Only doctor-ordered nursing tasks can be completed.");

            if (quantity <= 0)
                throw new InvalidOperationException("Quantity must be at least 1.");

            item.Quantity = quantity;
            item.IsCompleted = true;
            item.CompletedAt = DateTime.UtcNow;

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
            if (pendingCount > 0)
                throw new InvalidOperationException($"Cannot finalize bill. There are {pendingCount} pending services (Lab/Pharm) that must be completed first.");

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
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == billId);

            return bill == null ? null : MapToDto(bill, bill.Patient?.FullName ?? "Unknown Patient");
        }

        public async Task<BillDto?> GetBillByIdentifierAsync(string billNumber)
        {
            var bill = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.BillNumber == billNumber);

            return bill == null ? null : MapToDto(bill, bill.Patient?.FullName ?? "Unknown Patient");
        }

        public async Task<List<BillDto>> GetBillsByPhoneAsync(string phoneNumber)
        {
            var bills = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.Items).ThenInclude(i => i.AddedByStaff)
                .Include(b => b.Payments)
                .Where(b => b.Patient.PhoneNumber == phoneNumber)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bills.Select(b => MapToDto(b, b.Patient?.FullName ?? "Unknown Patient")).ToList();
        }

        public async Task<List<BillDto>> GetAllBillsAsync()
        {
            var bills = await _db.Bills
                .Include(b => b.Patient)
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
                .Where(b => b.CreatedByStaffId == doctorId && b.Status == BillStatus.Trash)
                .Include(b => b.Patient)
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
            BillNumber = bill.BillNumber,
            PatientName = patientName,
            Status = bill.Status.ToString(),
            CreatedAt = bill.CreatedAt,
            FinalizedAt = bill.FinalizedAt,
            TotalAmount = bill.TotalAmount,
            TotalInsurance = bill.TotalInsurance,
            PatientLiability = bill.PatientLiability,
            TotalPaid = bill.TotalPaid,
            BalanceDue = bill.BalanceDue,
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
            AddedBy = item.AddedByStaff?.FullName ?? "Unknown",
            AddedByRole = item.AddedByStaff?.Role.ToString() ?? "Unknown",
            AddedAt = item.AddedAt,
            CompletedAt = item.CompletedAt,
            Notes = item.Notes
        };
    }
}
