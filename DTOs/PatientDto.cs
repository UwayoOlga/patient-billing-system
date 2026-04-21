using System.ComponentModel.DataAnnotations;

namespace HospitalBilling.DTOs
{
    public class CreatePatientDto
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Full Name must be between 3 and 100 characters.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Date of Birth is required.")]
        public DateOnly DateOfBirth { get; set; }

        [Required(ErrorMessage = "Phone Number is required.")]
        [StringLength(15, MinimumLength = 10, ErrorMessage = "Phone Number should be between 10 and 15 digits.")]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }
    }

    public class PatientResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }
        public int InsuranceCoveragePercentage { get; set; }
        public DateTime RegisteredAt { get; set; }
    }
}
