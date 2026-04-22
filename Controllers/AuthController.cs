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

        [HttpPost("patient/register")]
        public async Task<IActionResult> PatientRegister([FromBody] PatientSelfRegisterDto dto)
        {
            if (await _db.Patients.AnyAsync(p => p.PhoneNumber == dto.PhoneNumber || (!string.IsNullOrEmpty(dto.Email) && p.Email == dto.Email)))
                return Conflict(new { message = "Phone number or email already in use." });

            var patient = new Patient
            {
                FullName = dto.FullName,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                DateOfBirth = dto.DateOfBirth,
                NationalId = dto.NationalId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RegisteredAt = DateTime.UtcNow
            };

            _db.Patients.Add(patient);
            await _db.SaveChangesAsync();

            var token = GeneratePatientToken(patient);
            return Ok(new { token, role = "Patient", name = patient.FullName, patientId = patient.Id });
        }

        [HttpPost("patient/login")]
        public async Task<IActionResult> PatientLogin([FromBody] PatientLoginDto dto)
        {
            var patient = await _db.Patients
                .FirstOrDefaultAsync(p => p.PhoneNumber == dto.Identifier || p.Email == dto.Identifier);

            if (patient == null || string.IsNullOrEmpty(patient.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, patient.PasswordHash))
                return Unauthorized(new { message = "Invalid credentials." });

            var token = GeneratePatientToken(patient);
            return Ok(new { token, role = "Patient", name = patient.FullName, patientId = patient.Id });
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

        private string GeneratePatientToken(Patient patient)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, patient.Id.ToString()),
                new Claim(ClaimTypes.Name, patient.FullName),
                new Claim(ClaimTypes.Role, "Patient")
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
