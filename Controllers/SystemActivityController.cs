using HospitalBilling.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class SystemActivityController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SystemActivityController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var today = DateTime.UtcNow.Date;

            var stats = new
            {
                TotalRevenue = await _db.Payments.Where(p => p.IsConfirmed).SumAsync(p => p.Amount),
                TodaysBills = await _db.Bills.CountAsync(b => b.CreatedAt >= today),
                TotalPatients = await _db.Patients.CountAsync(),
                PendingDisputes = await _db.Disputes.CountAsync(d => d.Status != HospitalBilling.Enums.DisputeStatus.Resolved)
            };

            return Ok(stats);
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetActivityLogs()
        {
            // We'll aggregate important system events from various tables
            
            var billLogs = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.CreatedByStaff)
                .OrderByDescending(b => b.CreatedAt)
                .Take(20)
                .Select(b => new {
                    Type = "Visit Created",
                    Description = $"Visit {b.BillNumber} for {b.Patient.FullName}",
                    User = b.CreatedByStaff != null ? b.CreatedByStaff.FullName : "System",
                    Timestamp = b.CreatedAt
                })
                .ToListAsync();

            var paymentLogs = await _db.Payments
                .Include(p => p.Bill)
                .Include(p => p.ConfirmedByStaff)
                .Where(p => p.IsConfirmed)
                .OrderByDescending(p => p.PaidAt)
                .Take(20)
                .Select(p => new {
                    Type = "Payment Confirmed",
                    Description = $"Payment of {p.Amount:N2} for Bill {p.Bill.BillNumber}",
                    User = p.ConfirmedByStaff != null ? p.ConfirmedByStaff.FullName : "System",
                    Timestamp = p.PaidAt
                })
                .ToListAsync();

            var itemLogs = await _db.BillItems
                .Include(bi => bi.Bill)
                .Include(bi => bi.AddedByStaff)
                .OrderByDescending(bi => bi.AddedAt)
                .Take(20)
                .Select(bi => new {
                    Type = "Charge Added",
                    Description = $"{bi.Description} added to Bill {bi.Bill.BillNumber}",
                    User = bi.AddedByStaff.FullName,
                    Timestamp = bi.AddedAt
                })
                .ToListAsync();

            var allLogs = billLogs
                .Concat(paymentLogs)
                .Concat(itemLogs)
                .OrderByDescending(l => l.Timestamp)
                .Take(50);

            return Ok(allLogs);
        }
    }
}
