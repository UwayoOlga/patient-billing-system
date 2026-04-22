using HospitalBilling.DTOs;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _payments;

        public PaymentController(IPaymentService payments)
        {
            _payments = payments;
        }

        /// <summary>
        /// Record a payment for a finalized bill (billing staff).
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpPost]
        public async Task<IActionResult> RecordPayment([FromBody] PaymentDto dto)
        {
            var staffId = GetStaffId();
            var payment = await _payments.RecordPaymentAsync(dto, staffId);
            return Ok(payment);
        }

        /// <summary>
        /// Confirm a payment (billing staff).
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpPatch("{paymentId}/confirm")]
        public async Task<IActionResult> ConfirmPayment(int paymentId)
        {
            var staffId = GetStaffId();
            var payment = await _payments.ConfirmPaymentAsync(paymentId, staffId);
            return Ok(payment);
        }

        /// <summary>
        /// Patient pay: Allows a patient to pay their own bill (simulated).
        /// </summary>
        [HttpPost("patient-pay")]
        public async Task<IActionResult> PatientPay([FromBody] PaymentDto dto)
        {
            // Record payment (no staffId involved for self-pay)
            var payment = await _payments.RecordPaymentAsync(dto, null);
            
            // For this simulation, we auto-confirm patient self-payments immediately
            await _payments.ConfirmPaymentAsync(payment.Id, null);
            
            return Ok(payment);
        }

        /// <summary>
        /// Get all payments for a bill (staff use).
        /// </summary>
        [HttpGet("bill/{billId}")]
        public async Task<IActionResult> GetPaymentsForBill(int billId)
        {
            var payments = await _payments.GetPaymentsForBillAsync(billId);
            return Ok(payments);
        }

        private int GetStaffId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
