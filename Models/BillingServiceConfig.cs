namespace HospitalBilling.Models
{
    public class BillingServiceConfig
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // Consultation, Lab, Pharmacy, etc.
        public decimal BasePrice { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
