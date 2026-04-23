using HospitalBilling.DTOs;

namespace HospitalBilling.Services.Interfaces
{
    public interface IDisputeService
    {
        // Patient raises a dispute (authenticated by BillNumber + DOB)
        Task<int> CreateDisputeAsync(CreateDisputeDto dto);

        // Billing staff resolves or rejects a dispute
        Task ResolveDisputeAsync(ResolveDisputeDto dto, int staffId);

        // Get all open disputes (billing staff)
        Task<List<DisputeSummaryDto>> GetOpenDisputesAsync();

        // Get disputes list for billing staff
        Task<List<DisputeSummaryDto>> GetDisputesAsync(bool openOnly);
    }

    public class DisputeSummaryDto
    {
        public int Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime RaisedAt { get; set; }
        public string BillStatus { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal BalanceDue { get; set; }
    }
}
