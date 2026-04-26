using HospitalBilling.Enums;

namespace HospitalBilling.DTOs
{
    public class BillItemDto
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal Subtotal { get; set; }
        public int? CoveragePercentage { get; set; }
        public decimal InsuranceAmount { get; set; }
        public decimal PatientAmount { get; set; }
        public bool IsCompleted { get; set; }
        public bool IsDisputed { get; set; }
        public string AddedBy { get; set; } = string.Empty;
        public string AddedByRole { get; set; } = string.Empty;
        public DateTime AddedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? CompletedByStaffId { get; set; }
        public string? Notes { get; set; }
    }

    public class BillDto
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Urgency { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? FinalizedAt { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalInsurance { get; set; }
        public decimal PatientLiability { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal BalanceDue { get; set; }
        public int? AssignedDoctorId { get; set; }
        public string? AssignedDoctorName { get; set; }
        public List<BillItemDto> Items { get; set; } = new();
        public List<PaymentResponseDto> Payments { get; set; } = new();
    }

    public class CreateBillDto
    {
        public int PatientId { get; set; }
        public UrgencyLevel Urgency { get; set; } = UrgencyLevel.Normal;
        public int? AssignedDoctorId { get; set; }
    }

    public class PatientBillAccessDto
    {
        public string BillNumber { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
    }
}
