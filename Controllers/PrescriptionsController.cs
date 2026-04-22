using HospitalBilling.DTOs;
using HospitalBilling.Enums;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrescriptionsController : ControllerBase
    {
        private readonly IBillingService _billing;

        public PrescriptionsController(IBillingService billing)
        {
            _billing = billing;
        }

        private int GetStaffId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        /// <summary>
        /// Doctor creates a prescription.
        /// </summary>
        [Authorize(Roles = "Doctor")]
        [HttpPost]
        public async Task<IActionResult> CreatePrescription([FromBody] CreatePrescriptionDto dto)
        {
            var staffId = GetStaffId();
            var prescription = await _billing.CreatePrescriptionAsync(dto, staffId);
            return Ok(prescription);
        }

        /// <summary>
        /// Get prescriptions for a specific bill (visit). Used by Doctor/Pharmacist.
        /// </summary>
        [Authorize]
        [HttpGet("bill/{billId}")]
        public async Task<IActionResult> GetPrescriptionsForBill(int billId)
        {
            var prescriptions = await _billing.GetPrescriptionsForBillAsync(billId);
            return Ok(prescriptions);
        }

        /// <summary>
        /// Pharmacist gets all pending prescriptions across all active visits.
        /// </summary>
        [Authorize(Roles = "Pharmacist,Admin")]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingPrescriptions()
        {
            var prescriptions = await _billing.GetPendingPrescriptionsAsync();
            return Ok(prescriptions);
        }

        /// <summary>
        /// Pharmacist dispenses a prescription, adding the exact drug charge to the bill.
        /// </summary>
        [Authorize(Roles = "Pharmacist,Admin")]
        [HttpPatch("{id}/dispense")]
        public async Task<IActionResult> DispensePrescription(int id, [FromBody] DispensePrescriptionDto dto)
        {
            var staffId = GetStaffId();
            var billItem = await _billing.DispensePrescriptionAsync(id, staffId, dto);
            return Ok(new { message = "Prescription dispensed successfully", billItem });
        }
    }
}
