using HospitalBilling.Data;
using HospitalBilling.DTOs;
using HospitalBilling.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        /// <summary>Staff login — returns a JWT token.</summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] StaffLoginDto dto)
        {
            var staff = await _db.Staff
                .FirstOrDefaultAsync(s => s.Email == dto.Email && s.IsActive);

            if (staff == null || !BCrypt.Net.BCrypt.Verify(dto.Password, staff.PasswordHash))
                return Unauthorized(new { message = "Invalid credentials." });

            var token = GenerateToken(staff);
            return Ok(new { token, role = staff.Role.ToString(), name = staff.FullName });
        }

        /// <summary>Register a new staff member (Admin only).</summary>
        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] CreateStaffDto dto)
        {
            if (await _db.Staff.AnyAsync(s => s.Email == dto.Email))
                return Conflict(new { message = "Email already exists." });

            var staff = new Staff
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                PhoneNumber = dto.PhoneNumber
            };

            _db.Staff.Add(staff);
            await _db.SaveChangesAsync();

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

        private string GenerateToken(Staff staff)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, staff.Id.ToString()),
                new Claim(ClaimTypes.Name, staff.Email),
                new Claim(ClaimTypes.Role, staff.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
