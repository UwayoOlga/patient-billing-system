using HospitalBilling.Data;
using HospitalBilling.DTOs;
using HospitalBilling.Enums;
using HospitalBilling.Models;
using HospitalBilling.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Services
{
    public class DisputeService : IDisputeService
    {
        private readonly AppDbContext _db;

        public DisputeService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<int> CreateDisputeAsync(CreateDisputeDto dto)
        {
            // Authenticate patient by BillNumber + DOB
            var bill = await _db.Bills
                .Include(b => b.Patient)
                .FirstOrDefaultAsync(b => b.BillNumber == dto.BillNumber
                                       && b.Patient.DateOfBirth == dto.DateOfBirth)
                ?? throw new UnauthorizedAccessException("Invalid Bill Number or Date of Birth.");

            if (bill.Status == BillStatus.Cancelled)
                throw new InvalidOperationException("Cannot dispute a cancelled bill.");

            var dispute = new Dispute
            {
                BillId = bill.Id,
                Reason = dto.Reason
            };

            bill.Status = BillStatus.Disputed;

            _db.Disputes.Add(dispute);
            await _db.SaveChangesAsync();

            return dispute.Id;
        }

        public async Task ResolveDisputeAsync(ResolveDisputeDto dto, int staffId)
        {
            var dispute = await _db.Disputes
                .Include(d => d.Bill)
                .Include(d => d.BillItem)
                .FirstOrDefaultAsync(d => d.Id == dto.DisputeId)
                ?? throw new KeyNotFoundException("Dispute not found.");

            dispute.Status = dto.IsResolved ? DisputeStatus.Resolved : DisputeStatus.Rejected;
            dispute.ResolvedAt = DateTime.UtcNow;
            dispute.ResolvedByStaffId = staffId;
            dispute.ResolutionNotes = dto.ResolutionNotes;

            // Clear the disputed flag on the bill item
            if (dispute.BillItem != null)
                dispute.BillItem.IsDisputed = false;

            // Revert bill to Finalized so it can be paid
            if (dispute.Bill.Status == BillStatus.Disputed)
                dispute.Bill.Status = BillStatus.Finalized;

            await _db.SaveChangesAsync();
        }

        public async Task<List<DisputeSummaryDto>> GetOpenDisputesAsync()
        {
            return await _db.Disputes
                .Include(d => d.Bill).ThenInclude(b => b.Patient)
                .Where(d => d.Status == DisputeStatus.Open || d.Status == DisputeStatus.UnderReview)
                .OrderByDescending(d => d.RaisedAt)
                .Select(d => new DisputeSummaryDto
                {
                    Id = d.Id,
                    BillNumber = d.Bill.BillNumber,
                    PatientName = d.Bill.Patient.FullName,
                    Reason = d.Reason,
                    Status = d.Status.ToString(),
                    RaisedAt = d.RaisedAt
                })
                .ToListAsync();
        }
    }
}
