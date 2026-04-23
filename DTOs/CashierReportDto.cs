namespace HospitalBilling.DTOs
{
    public class CashierReportDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal TotalCollected { get; set; }
        public int TotalTransactions { get; set; }
        public decimal AverageTransactionAmount { get; set; }
        public List<CashierPaymentMethodSummaryDto> PaymentMethodSummary { get; set; } = new();
        public List<CashierTransactionDto> Transactions { get; set; } = new();
    }

    public class CashierPaymentMethodSummaryDto
    {
        public string Method { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    public class CashierTransactionDto
    {
        public int PaymentId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime PaidAt { get; set; }
        public string? Reference { get; set; }
        public string ConfirmedBy { get; set; } = "System";
    }
}
