using HospitalBilling.Enums;

namespace HospitalBilling.Models
{
    public class Dispute
    {
        public int Id { get; set; }

        public int BillId { get; set; }
        public Bill Bill { get; set; } = null!;
        public int? BillItemId { get; set; }
        public BillItem? BillItem { get; set; }

        public string Reason { get; set; } = string.Empty;
        public DisputeStatus Status { get; set; } = DisputeStatus.Open;

        public DateTime RaisedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }

        // Resolved by billing staff
        public int? ResolvedByStaffId { get; set; }
        public Staff? ResolvedByStaff { get; set; }

        public string? ResolutionNotes { get; set; }
    }
}
