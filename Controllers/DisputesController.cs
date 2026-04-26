using HospitalBilling.DTOs;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DisputesController : ControllerBase
    {
        private readonly IDisputeService _disputes;

        public DisputesController(IDisputeService disputes)
        {
            _disputes = disputes;
        }

        /// <summary>
        /// Patient raises a dispute (authenticated by BillNumber + DOB, no login needed).
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateDispute([FromBody] CreateDisputeDto dto)
        {
            var disputeId = await _disputes.CreateDisputeAsync(dto);
            return Ok(new { disputeId, message = "Dispute submitted. Billing staff will review it." });
        }

        /// <summary>
        /// Billing staff resolves or rejects a dispute.
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpPatch("resolve")]
        public async Task<IActionResult> ResolveDispute([FromBody] ResolveDisputeDto dto)
        {
            var staffId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _disputes.ResolveDisputeAsync(dto, staffId);
            return Ok(new { message = "Dispute updated." });
        }

        /// <summary>
        /// Get all open disputes (billing staff).
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpGet("open")]
        public async Task<IActionResult> GetOpenDisputes()
        {
            var disputes = await _disputes.GetOpenDisputesAsync();
            return Ok(disputes);
        }

        /// <summary>
        /// Get disputes list for billing staff (openOnly=true by default).
        /// </summary>
        [Authorize(Roles = "Cashier,Admin")]
        [HttpGet]
        public async Task<IActionResult> GetDisputes([FromQuery] bool openOnly = true)
        {
            var disputes = await _disputes.GetDisputesAsync(openOnly);
            return Ok(disputes);
        }
    }
}
