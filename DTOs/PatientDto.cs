namespace HospitalBilling.DTOs
{
    public class CreatePatientDto
    {
        public string FullName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }
        public int InsuranceCoveragePercentage { get; set; } = 0;
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
