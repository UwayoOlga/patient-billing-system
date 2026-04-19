namespace HospitalBilling.Models
{
    public class Payment
    {
        public int Id { get; set; }

        public int BillId { get; set; }
        public Bill Bill { get; set; } = null!;

        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty; // Cash, Card, Insurance, etc.
        public bool IsConfirmed { get; set; } = false;

        // Confirmed by billing staff
        public int? ConfirmedByStaffId { get; set; }
        public Staff? ConfirmedByStaff { get; set; }

        public DateTime PaidAt { get; set; } = DateTime.UtcNow;
        public string? Reference { get; set; }
    }
}
