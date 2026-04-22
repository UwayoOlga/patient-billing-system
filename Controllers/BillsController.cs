using HospitalBilling.DTOs;
using HospitalBilling.Enums;
using HospitalBilling.Helpers;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HospitalBilling.Controllers
{
    public class AssignDoctorDto { public int? DoctorId { get; set; } }

    [Route("api/[controller]")]
    [ApiController]
    public class BillsController : ControllerBase
    {
        private readonly IBillingService _billing;
        private readonly IConfiguration _config;

        public BillsController(IBillingService billing, IConfiguration config)
        {
            _billing = billing;
            _config = config;
        }

        /// <summary>
        /// Doctor access: get bills/visits where the doctor added at least one item.
        /// </summary>
        [Authorize(Roles = "Doctor")]
        [HttpGet("doctor")]
        public async Task<IActionResult> GetDoctorBills()
        {
            var staffId = GetStaffId();
            var bills = await _billing.GetBillsForDoctorAsync(staffId);
            if (GetStaffRole() == StaffRole.Doctor)
            {
                bills = bills.Select(HideInsuranceCoverage).ToList();
            }
            return Ok(bills);
        }

        /// <summary>
        /// Patient access: view bill using ONLY BillNumber (no login or DOB required).
        /// </summary>
        [HttpPost("view")]
        public async Task<IActionResult> ViewBill([FromBody] string billNumber)
        {
            var bill = await _billing.GetBillByIdentifierAsync(billNumber);
            if (bill == null)
                return NotFound(new { message = "Bill not found. Check your Bill Number." });

            return Ok(bill);
        }

        /// <summary>
        /// Patient access via QR scan: GET /api/bills/qr/{billNumber}
        /// </summary>
        [HttpGet("qr/{billNumber}")]
        public async Task<IActionResult> ViewBillByQR(string billNumber)
        {
            var bill = await _billing.GetBillByIdentifierAsync(billNumber);
            if (bill == null)
                return NotFound(new { message = "Bill not found." });

            return Ok(bill);
        }

        /// <summary>
        /// Open a new bill for a patient.
        /// </summary>
        [Authorize(Roles = "Receptionist,Admin,Cashier")]
        [HttpPost]
        public async Task<IActionResult> CreateBill([FromBody] CreateBillDto dto)
        {
            var staffId = GetStaffId();
            var bill = await _billing.CreateBillAsync(dto, staffId);

            // Generate QR payload
            var baseUrl = _config["App:BaseUrl"] ?? "https://localhost";
            var qrPayload = QRCodeHelper.GenerateQRPayload(bill.BillNumber, baseUrl);

            return Ok(new { bill, qrPayload });
        }

        /// <summary>
        /// Add a charge to a bill. Role determines what categories are allowed.
        /// </summary>
        [Authorize]
        [HttpPost("items")]
        public async Task<IActionResult> AddBillItem([FromBody] AddBillItemDto dto)
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();

            var item = await _billing.AddBillItemAsync(dto, staffId, staffRole);
            return Ok(item);
        }

        /// <summary>
        /// Remove a charge from a bill (if mistake was made).
        /// </summary>
        [Authorize]
        [HttpDelete("items/{itemId}")]
        public async Task<IActionResult> RemoveBillItem(int itemId)
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();

            try
            {
                await _billing.RemoveBillItemAsync(itemId, staffId, staffRole);
                return Ok(new { message = "Item removed successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lab technician marks a test as completed (billable).
        /// </summary>
        [Authorize(Roles = "LabTech,Cashier,Admin")]
        [HttpPatch("items/{itemId}/complete")]
        public async Task<IActionResult> MarkTestCompleted(int itemId, [FromBody] MarkTestCompletedDto dto)
        {
            var staffId = GetStaffId();
            await _billing.MarkTestCompletedAsync(itemId, staffId, dto?.ResultNotes);
            return Ok(new { message = "Test marked as completed." });
        }

        /// <summary>
        /// Lab technician reverts a completed test back to pending.
        /// </summary>
        [Authorize(Roles = "LabTech,Admin")]
        [HttpPatch("items/{itemId}/revert")]
        public async Task<IActionResult> RevertTestCompleted(int itemId)
        {
            var staffId = GetStaffId();
            await _billing.RevertTestCompletedAsync(itemId, staffId);
            return Ok(new { message = "Test reverted to pending." });
        }

        /// <summary>
        /// Pharmacist dispenses medication.
        /// </summary>
        [Authorize(Roles = "Pharmacist,Cashier,Admin")]
        [HttpPatch("items/{itemId}/dispense")]
        public async Task<IActionResult> DispenseMedication(int itemId, [FromBody] DispenseMedicationDto dto)
        {
            var staffId = GetStaffId();
            await _billing.DispenseMedicationAsync(itemId, staffId, dto.Quantity);
            return Ok(new { message = "Medication dispensed successfully." });
        }

        /// <summary>
        /// Nurse marks a doctor-ordered nursing service as completed/billable.
        /// </summary>
        [Authorize(Roles = "Nurse,Cashier,Admin")]
        [HttpPatch("items/{itemId}/nursing-complete")]
        public async Task<IActionResult> CompleteNursingOrder(int itemId, [FromBody] CompleteNursingOrderDto dto)
        {
            var staffId = GetStaffId();
            await _billing.CompleteNursingOrderAsync(itemId, staffId, dto.Quantity, dto.Notes);
            return Ok(new { message = "Nursing service completed successfully." });
        }

        /// <summary>
        /// Billing staff finalizes the bill (locks it for payment).
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpPatch("{billId}/finalize")]
        public async Task<IActionResult> FinalizeBill(int billId)
        {
            var staffId = GetStaffId();
            var bill = await _billing.FinalizeBillAsync(billId, staffId);
            return Ok(bill);
        }

        /// <summary>
        /// Get a bill by ID (staff use).
        /// </summary>
        [Authorize]
        [HttpGet("{billId}")]
        public async Task<IActionResult> GetBill(int billId)
        {
            var bill = await _billing.GetBillByIdAsync(billId);
            if (bill == null) return NotFound();
            if (GetStaffRole() == StaffRole.Doctor)
            {
                bill = HideInsuranceCoverage(bill);
            }
            return Ok(bill);
        }

        /// <summary>
        /// Get all bills (billing staff only).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllBills()
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();
            var bills = await _billing.GetAllBillsAsync(staffId, staffRole);
            return Ok(bills);
        }

        /// <summary>
        /// All staff can see a summary of visits to add charges or perform tests.
        /// </summary>
        [Authorize]
        [HttpGet("summary")]
        public async Task<IActionResult> GetBillsSummary()
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();
            var bills = await _billing.GetAllBillsAsync(staffId, staffRole);
            if (GetStaffRole() == StaffRole.Doctor)
            {
                bills = bills.Select(HideInsuranceCoverage).ToList();
            }
            return Ok(bills.Select(b => new
            {
                b.Id,
                b.PatientId,
                b.BillNumber,
                b.PatientName,
                b.Status,
                b.BalanceDue,
                b.AssignedDoctorName,
                b.Items
            }));
        }

        /// <summary>
        /// Receptionist or Admin updates the assigned doctor for a visit.
        /// </summary>
        [Authorize(Roles = "Receptionist,Admin")]
        [HttpPatch("{billId}/assign-doctor")]
        public async Task<IActionResult> AssignDoctor(int billId, [FromBody] AssignDoctorDto dto)
        {
            try
            {
                await _billing.UpdateAssignedDoctorAsync(billId, dto.DoctorId);
                return Ok(new { message = "Doctor assigned successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Delete a bill (doctor or billing staff).
        /// </summary>
        [Authorize(Roles = "Doctor,Cashier,Admin")]
        [HttpDelete("{billId}")]
        public async Task<IActionResult> DeleteBill(int billId)
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();

            try
            {
                await _billing.DeleteBillAsync(billId, staffId, staffRole);
                return Ok(new { message = "Visit moved to trash." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Doctor")]
        [HttpGet("trash")]
        public async Task<IActionResult> GetTrash()
        {
            var staffId = GetStaffId();
            var bills = await _billing.GetTrashBillsForDoctorAsync(staffId);
            bills = bills.Select(HideInsuranceCoverage).ToList();
            return Ok(bills);
        }

        [Authorize(Roles = "Doctor")]
        [HttpPatch("{billId}/restore")]
        public async Task<IActionResult> RestoreBill(int billId)
        {
            var staffId = GetStaffId();
            try
            {
                await _billing.RestoreBillAsync(billId, staffId);
                return Ok(new { message = "Visit restored successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Doctor,Cashier,Admin")]
        [HttpDelete("{billId}/permanent")]
        public async Task<IActionResult> PermanentlyDeleteBill(int billId)
        {
            var staffId = GetStaffId();
            var staffRole = GetStaffRole();

            try
            {
                await _billing.PermanentlyDeleteBillAsync(billId, staffId, staffRole);
                return Ok(new { message = "Visit permanently deleted." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Patient access: view ALL bills associated with a phone number.
        /// </summary>
        [HttpGet("history/{phoneNumber}")]
        public async Task<IActionResult> GetPatientHistory(string phoneNumber)
        {
            var bills = await _billing.GetBillsByPhoneAsync(phoneNumber);
            return Ok(bills);
        }

        // --- Helpers ---

        private int GetStaffId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private StaffRole GetStaffRole() =>
            Enum.Parse<StaffRole>(User.FindFirstValue(ClaimTypes.Role)!, true);

        private static BillDto HideInsuranceCoverage(BillDto bill)
        {
            bill.TotalInsurance = 0;
            bill.PatientLiability = 0;
            bill.Items = bill.Items.Select(i =>
            {
                i.CoveragePercentage = null;
                i.InsuranceAmount = 0;
                i.PatientAmount = 0;
                return i;
            }).ToList();
            return bill;
        }
    }
}
