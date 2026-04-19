using HospitalBilling.Data;
using HospitalBilling.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ServiceCategoryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ServiceCategoryController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _db.ServiceCategories.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ServiceCategory category)
        {
            _db.ServiceCategories.Add(category);
            await _db.SaveChangesAsync();
            return Ok(category);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ServiceCategory dto)
        {
            var category = await _db.ServiceCategories.FindAsync(id);
            if (category == null) return NotFound();

            category.Name = dto.Name;
            category.BasePrice = dto.BasePrice;
            category.ResponsibleRole = dto.ResponsibleRole;
            category.Description = dto.Description;
            category.IsActive = dto.IsActive;

            await _db.SaveChangesAsync();
            return Ok(category);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _db.ServiceCategories.FindAsync(id);
            if (category == null) return NotFound();

            _db.ServiceCategories.Remove(category);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Service category deleted." });
        }
    }
}
