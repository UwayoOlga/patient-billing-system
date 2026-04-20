using HospitalBilling.Enums;

namespace HospitalBilling.Models
{
    public class Bill
    {
        public int Id { get; set; }

        // Human-readable visit/bill reference shown to patient
        public string BillNumber { get; set; } = string.Empty;

        public int PatientId { get; set; }
        public Patient Patient { get; set; } = null!;

        public BillStatus Status { get; set; } = BillStatus.Open;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? FinalizedAt { get; set; }

        // Staff who opened/created this bill (doctor or reception)
        public int? CreatedByStaffId { get; set; }
        public Staff? CreatedByStaff { get; set; }

        // Set by billing staff when finalizing
        public int? FinalizedByStaffId { get; set; }
        public Staff? FinalizedByStaff { get; set; }

        public ICollection<BillItem> Items { get; set; } = new List<BillItem>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Dispute> Disputes { get; set; } = new List<Dispute>();

        public decimal TotalAmount => Items.Where(i => i.IsCompleted).Sum(i => i.GrossAmount);
        public decimal TotalInsurance => Items.Where(i => i.IsCompleted).Sum(i => i.InsuranceAmount);
        public decimal PatientLiability => TotalAmount - TotalInsurance;
        
        public decimal TotalPaid => Payments.Where(p => p.IsConfirmed).Sum(p => p.Amount);
        public decimal BalanceDue => PatientLiability - TotalPaid;
    }
}
