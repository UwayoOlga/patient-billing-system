using System.ComponentModel.DataAnnotations;

namespace HospitalBilling.DTOs
{
    public class CreatePatientDto
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Full Name must be between 3 and 100 characters.")]
        [RegularExpression(@"^[a-zA-Z\s'\-]+$", ErrorMessage = "Full Name can only contain letters, spaces, apostrophes, and hyphens.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Date of Birth is required.")]
        public DateOnly DateOfBirth { get; set; }

        [Required(ErrorMessage = "Phone Number is required.")]
        [RegularExpression(@"^\+?[0-9]{10,15}$", ErrorMessage = "Phone Number must be 10–15 digits (e.g. +250780000000).")]
        public string PhoneNumber { get; set; } = string.Empty;

        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }

        [RegularExpression(@"^[0-9]{16}$", ErrorMessage = "National ID must be exactly 16 digits.")]
        public string? NationalId { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email address.")]
        public string? Email { get; set; }
    }

    public class PatientResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public DateOnly DateOfBirth { get; set; }
        public string? NationalId { get; set; }
        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }
        public int InsuranceCoveragePercentage { get; set; }
        public DateTime RegisteredAt { get; set; }
    }

    public class PatientLoginDto
    {
        [Required(ErrorMessage = "Phone number or email is required.")]
        [StringLength(150, MinimumLength = 5, ErrorMessage = "Identifier must be between 5 and 150 characters.")]
        public string Identifier { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters.")]
        public string Password { get; set; } = string.Empty;
    }

    public class PatientSelfRegisterDto
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Full Name must be between 3 and 100 characters.")]
        [RegularExpression(@"^[a-zA-Z\s'\-]+$", ErrorMessage = "Full Name can only contain letters, spaces, apostrophes, and hyphens.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone Number is required.")]
        [RegularExpression(@"^\+?[0-9]{10,15}$", ErrorMessage = "Phone Number must be 10–15 digits (e.g. +250780000000).")]
        public string PhoneNumber { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [StringLength(200, ErrorMessage = "Email address is too long.")]
        public string? Email { get; set; }

        [Required(ErrorMessage = "Date of Birth is required.")]
        public DateOnly DateOfBirth { get; set; }

        [Required(ErrorMessage = "National ID is required.")]
        [RegularExpression(@"^[0-9]{16}$", ErrorMessage = "National ID must be exactly 16 digits.")]
        public string NationalId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [StringLength(100, ErrorMessage = "Password is too long.")]
        public string Password { get; set; } = string.Empty;
    }
    public class PatientReportVisitDto
    {
        public int BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal PatientAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class PatientReportDto
    {
        public string PatientName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal TotalInsurance { get; set; }
        public int VisitCount { get; set; }
        public List<PatientReportVisitDto> Visits { get; set; } = new();
    }
}

