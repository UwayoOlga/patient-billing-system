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
        public async Task<IActionResult> GetGlobalLedger(DateTime? startDate, DateTime? endDate)
        {
            var query = _db.Payments
                .Include(p => p.Bill).ThenInclude(b => b.Patient)
                .Include(p => p.ConfirmedByStaff)
                .AsQueryable();

            if (startDate.HasValue) query = query.Where(p => p.PaidAt >= startDate.Value);
            if (endDate.HasValue) query = query.Where(p => p.PaidAt <= endDate.Value);

            var payments = await query
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

        [HttpGet("summary")]
        public async Task<IActionResult> GetFinanceSummary(DateTime? startDate, DateTime? endDate)
        {
            var query = _db.Payments.Where(p => p.IsConfirmed);
            if (startDate.HasValue) query = query.Where(p => p.PaidAt >= startDate.Value);
            if (endDate.HasValue) query = query.Where(p => p.PaidAt <= endDate.Value);

            var totalRevenue = await query.SumAsync(p => p.Amount);
            
            var deptQuery = _db.BillItems.AsQueryable();
            if (startDate.HasValue) deptQuery = deptQuery.Where(bi => bi.AddedAt >= startDate.Value);
            if (endDate.HasValue) deptQuery = deptQuery.Where(bi => bi.AddedAt <= endDate.Value);

            var departmentRevenue = await deptQuery
                .GroupBy(bi => bi.Category)
                .Select(g => new {
                    Department = g.Key,
                    Revenue = g.Sum(x => x.Quantity * x.UnitPrice)
                })
                .ToListAsync();

            var departmentRevenueResult = departmentRevenue
                .Select(x => new {
                    Department = x.Department.ToString(),
                    x.Revenue
                }).ToList();

            return Ok(new {
                TotalRevenue = totalRevenue,
                DepartmentRevenue = departmentRevenueResult
            });
        }

        [HttpGet("trends")]
        public async Task<IActionResult> GetRevenueTrends()
        {
            // Revenue for the last 7 days
            var weekAgo = DateTime.UtcNow.Date.AddDays(-7);
            
            var trends = await _db.Payments
                .Where(p => p.IsConfirmed && p.PaidAt >= weekAgo)
                .GroupBy(p => p.PaidAt.Date)
                .Select(g => new {
                    Date = g.Key,
                    Amount = g.Sum(x => x.Amount)
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            var trendsResult = trends.Select(x => new {
                Date = x.Date.ToString("yyyy-MM-dd"),
                x.Amount
            }).ToList();

            return Ok(trendsResult);
        }
    }
}
