using HospitalBilling.Enums;
using HospitalBilling.Models;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DisputeController : ControllerBase
    {
        private readonly IBillingService _billing;

        public DisputeController(IBillingService billing)
        {
            _billing = billing;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Cashier")]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _billing.GetAllDisputesAsync());
        }

        [HttpPost("raise/{itemId}")]
        public async Task<IActionResult> Raise(int itemId, [FromBody] string reason)
        {
            await _billing.RaiseItemDisputeAsync(itemId, reason);
            return Ok(new { message = "Item flagged for dispute. Administrators will review." });
        }

        [HttpPatch("resolve/{id}")]
        [Authorize(Roles = "Admin,Cashier")]
        public async Task<IActionResult> Resolve(int id, [FromBody] ResolveItemDisputeDto dto)
        {
            var staffId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _billing.ResolveItemDisputeAsync(id, staffId, dto.Approve, dto.Notes);
            return Ok(new { message = "Dispute resolved." });
        }
    }

    public class ResolveItemDisputeDto
    {
        public bool Approve { get; set; }
        public string Notes { get; set; } = string.Empty;
    }
}
