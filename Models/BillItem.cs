using HospitalBilling.Enums;

namespace HospitalBilling.Models
{
    public class BillItem
    {
        public int Id { get; set; }

        public int BillId { get; set; }
        public Bill Bill { get; set; } = null!;

        public int AddedByStaffId { get; set; }
        public Staff AddedByStaff { get; set; } = null!;

        public BillItemCategory Category { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;

        // For lab tests: marks the test as completed/billable
        public bool IsCompleted { get; set; } = true;
        public DateTime? CompletedAt { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }

        // Insurance Split
        public int InsuranceCoveragePercentage { get; set; } = 0;
        public decimal GrossAmount => UnitPrice * Quantity;
        public decimal InsuranceAmount => GrossAmount * InsuranceCoveragePercentage / 100;
        public decimal PatientAmount => GrossAmount - InsuranceAmount;
    }
}
