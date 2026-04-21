using HospitalBilling.Data;
using HospitalBilling.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly AppDbContext _db;

        public StaffController(AppDbContext db)
        {
            _db = db;
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var staffId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var staff = await _db.Staff.FindAsync(staffId);
            if (staff == null) return NotFound();

            return Ok(new StaffResponseDto
            {
                Id = staff.Id,
                FullName = staff.FullName,
                Email = staff.Email,
                Role = staff.Role.ToString(),
                PhoneNumber = staff.PhoneNumber,
                CreatedAt = staff.CreatedAt
            });
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var staffId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var staff = await _db.Staff.FindAsync(staffId);
            if (staff == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.FullName))
                staff.FullName = dto.FullName;

            if (!string.IsNullOrWhiteSpace(dto.Email))
                staff.Email = dto.Email;

            if (dto.PhoneNumber != null)
                staff.PhoneNumber = dto.PhoneNumber;

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
                staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

            await _db.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully." });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            var query = _db.Staff.AsQueryable();
            
            // Only admins can see inactive staff
            if (userRole != "Admin") {
                query = query.Where(s => s.IsActive);
            }

            var staff = await query
                .Select(s => new {
                    s.Id,
                    s.FullName,
                    s.Email,
                    s.PhoneNumber,
                    Role = (int)s.Role,
                    s.IsActive,
                    s.CreatedAt
                })
                .ToListAsync();

            return Ok(staff);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] dynamic body)
        {
            var staff = await _db.Staff.FindAsync(id);
            if (staff == null) return NotFound();

            bool isActive = body.GetProperty("isActive").GetBoolean();
            staff.IsActive = isActive;
            
            await _db.SaveChangesAsync();
            return Ok(new { message = "Status updated." });
        }

        /// <summary>Permanently delete a staff member (Admin only).</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            var staff = await _db.Staff.FindAsync(id);
            if (staff == null) return NotFound();

            // Prevent self-deletion for safety
            var currentStaffId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            if (staff.Id == currentStaffId)
                return BadRequest(new { message = "You cannot delete your own account." });

            _db.Staff.Remove(staff);
            await _db.SaveChangesAsync();

            return Ok(new { message = $"{staff.FullName} permanently removed." });
        }

        /// <summary>Update any staff member's details (Admin only).</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStaff(int id, [FromBody] dynamic body)
        {
            var staff = await _db.Staff.FindAsync(id);
            if (staff == null) return NotFound();

            if (body.TryGetProperty("fullName", out System.Text.Json.JsonElement fn)) staff.FullName = fn.GetString() ?? staff.FullName;
            if (body.TryGetProperty("email", out System.Text.Json.JsonElement em)) staff.Email = em.GetString() ?? staff.Email;
            if (body.TryGetProperty("phoneNumber", out System.Text.Json.JsonElement pn)) staff.PhoneNumber = pn.GetString();
            if (body.TryGetProperty("role", out System.Text.Json.JsonElement rl)) staff.Role = (HospitalBilling.Enums.StaffRole)rl.GetInt32();
            if (body.TryGetProperty("password", out System.Text.Json.JsonElement pw) && !string.IsNullOrWhiteSpace(pw.GetString())) 
                staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(pw.GetString());

            await _db.SaveChangesAsync();
            return Ok(new { message = $"{staff.FullName} updated successfully." });
        }
    }
}
