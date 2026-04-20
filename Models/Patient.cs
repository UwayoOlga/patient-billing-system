namespace HospitalBilling.Models
{
    public class Patient
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

        // Insurance metadata (0 if uninsured)
        public string? InsuranceProvider { get; set; }
        public string? InsuranceNumber { get; set; }
        public int InsuranceCoveragePercentage { get; set; } = 0;

        public ICollection<Bill> Bills { get; set; } = new List<Bill>();
    }
}
