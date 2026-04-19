using HospitalBilling.Data;
using HospitalBilling.DTOs;
using HospitalBilling.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace HospitalBilling.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PatientController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PatientController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>Register a new patient (any staff).</summary>
        [HttpPost]
        public async Task<IActionResult> Register([FromBody] CreatePatientDto dto)
        {
            var patient = new Patient
            {
                FullName = dto.FullName,
                DateOfBirth = dto.DateOfBirth,
                PhoneNumber = dto.PhoneNumber
            };

            _db.Patients.Add(patient);
            await _db.SaveChangesAsync();

            return Ok(new PatientResponseDto
            {
                Id = patient.Id,
                FullName = patient.FullName,
                PhoneNumber = patient.PhoneNumber,
                RegisteredAt = patient.RegisteredAt
            });
        }
        [HttpGet]
        public async Task<IActionResult> GetAllPatients()
        {
            var patients = _db.Patients.Select(p => new PatientResponseDto
            {
                Id = p.Id,
                FullName = p.FullName,
                PhoneNumber = p.PhoneNumber,
                RegisteredAt = p.RegisteredAt
            }).ToList();
            
            return Ok(patients);
        }

        /// <summary>Doctor access: only patients they created or charged.</summary>
        [HttpGet("mine")]
        public async Task<IActionResult> GetMyPatients()
        {
            var staffIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(staffIdClaim, out var staffId))
                return Unauthorized();

            // Patients from bills the doctor created OR added charges to
            var patientIds = await _db.Bills
                .Where(b => b.CreatedByStaffId == staffId ||
                            b.Items.Any(i => i.AddedByStaffId == staffId))
                .Select(b => b.PatientId)
                .Distinct()
                .ToListAsync();

            var patients = await _db.Patients
                .Where(p => patientIds.Contains(p.Id))
                .Select(p => new PatientResponseDto
                {
                    Id = p.Id,
                    FullName = p.FullName,
                    PhoneNumber = p.PhoneNumber,
                    RegisteredAt = p.RegisteredAt
                })
                .ToListAsync();

            return Ok(patients);
        }
    }
}
