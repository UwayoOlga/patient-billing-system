namespace HospitalBilling.DTOs
{
    public class PaymentDto
    {
        public int BillId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public string? Reference { get; set; }
    }

    public class PaymentResponseDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public bool IsConfirmed { get; set; }
        public DateTime PaidAt { get; set; }
        public string? Reference { get; set; }
    }
}
