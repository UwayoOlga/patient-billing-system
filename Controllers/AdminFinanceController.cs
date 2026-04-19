using HospitalBilling.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminFinanceController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminFinanceController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("ledger")]
        public async Task<IActionResult> GetGlobalLedger()
        {
            var payments = await _db.Payments
                .Include(p => p.Bill).ThenInclude(b => b.Patient)
                .Include(p => p.ConfirmedByStaff)
                .OrderByDescending(p => p.PaidAt)
                .Select(p => new
                {
                    p.Id,
                    PatientName = p.Bill.Patient.FullName,
                    p.Amount,
                    p.Method,
                    p.IsConfirmed,
                    ConfirmedBy = p.ConfirmedByStaff != null ? p.ConfirmedByStaff.FullName : "System",
                    p.PaidAt,
                    p.Reference,
                    BillNumber = p.Bill.BillNumber
                })
                .ToListAsync();

            return Ok(payments);
        }

        [HttpGet("debts")]
        public async Task<IActionResult> GetUnpaidVisits()
        {
            // Visits that are finalized but still have a balance due
            // Note: In EF Core 10, we'll calculate the balance on the fly
            var bills = await _db.Bills
                .Include(b => b.Patient)
                .Include(b => b.Items)
                .Include(b => b.Payments)
                .Where(b => b.Status != HospitalBilling.Enums.BillStatus.Trash)
                .ToListAsync();

            var debts = bills
                .Select(b => new
                {
                    b.Id,
                    b.BillNumber,
                    PatientName = b.Patient.FullName,
                    b.CreatedAt,
                    TotalAmount = b.Items.Sum(i => i.Quantity * i.UnitPrice),
                    TotalPaid = b.Payments.Where(p => p.IsConfirmed).Sum(p => p.Amount),
                })
                .Where(x => x.TotalAmount - x.TotalPaid > 0)
                .OrderByDescending(x => x.TotalAmount - x.TotalPaid)
                .ToList();

            return Ok(debts);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetFinanceSummary()
        {
            var today = DateTime.UtcNow.Date;
            
            var totalRevenue = await _db.Payments.Where(p => p.IsConfirmed).SumAsync(p => p.Amount);
            var todayRevenue = await _db.Payments.Where(p => p.IsConfirmed && p.PaidAt >= today).SumAsync(p => p.Amount);
            
            var departmentRevenue = await _db.BillItems
                .Include(bi => bi.Bill).ThenInclude(b => b.Payments)
                .GroupBy(bi => bi.Category)
                .Select(g => new {
                    Department = g.Key.ToString(),
                    Revenue = g.Sum(x => x.Quantity * x.UnitPrice)
                })
                .ToListAsync();

            return Ok(new {
                TotalRevenue = totalRevenue,
                TodayRevenue = todayRevenue,
                DepartmentRevenue = departmentRevenue
            });
        }
    }
}
