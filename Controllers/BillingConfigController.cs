using HospitalBilling.Data;
using HospitalBilling.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class BillingConfigController : ControllerBase
    {
        private readonly AppDbContext _db;

        public BillingConfigController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _db.ServiceConfigs.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BillingServiceConfig config)
        {
            config.UpdatedAt = DateTime.UtcNow;
            _db.ServiceConfigs.Add(config);
            await _db.SaveChangesAsync();
            return Ok(config);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BillingServiceConfig dto)
        {
            var config = await _db.ServiceConfigs.FindAsync(id);
            if (config == null) return NotFound();

            config.Name = dto.Name;
            config.Category = dto.Category;
            config.BasePrice = dto.BasePrice;
            config.IsActive = dto.IsActive;
            config.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(config);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var config = await _db.ServiceConfigs.FindAsync(id);
            if (config == null) return NotFound();

            _db.ServiceConfigs.Remove(config);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Service config deleted." });
        }
    }
}
