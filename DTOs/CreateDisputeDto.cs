namespace HospitalBilling.DTOs
{
    public class CreateDisputeDto
    {
        public string BillNumber { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ResolveDisputeDto
    {
        public int DisputeId { get; set; }
        public bool IsResolved { get; set; } // true = Resolved, false = Rejected
        public string? ResolutionNotes { get; set; }
    }
}
