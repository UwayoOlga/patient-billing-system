using HospitalBilling.Data;
using HospitalBilling.DTOs;
using HospitalBilling.Enums;
using HospitalBilling.Models;
using HospitalBilling.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _db;

        public PaymentService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PaymentResponseDto> RecordPaymentAsync(PaymentDto dto, int? staffId)
        {
            var bill = await _db.Bills
                .Include(b => b.Items)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == dto.BillId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Open && bill.Status != BillStatus.Finalized && bill.Status != BillStatus.Paid)
                throw new InvalidOperationException("This bill cannot accept payments in its current state.");

            if (dto.Amount > bill.BalanceDue && dto.Amount > 0)
                throw new InvalidOperationException($"Cannot pay more than the balance due (RWF {bill.BalanceDue}).");

            var payment = new Payment
            {
                BillId = dto.BillId,
                Amount = dto.Amount,
                Method = dto.Method,
                Reference = dto.Reference,
                IsConfirmed = false
            };

            _db.Payments.Add(payment);
            await _db.SaveChangesAsync();

            return MapToDto(payment);
        }

        public async Task<PaymentResponseDto> ConfirmPaymentAsync(int paymentId, int? staffId)
        {
            var payment = await _db.Payments
                .Include(p => p.Bill).ThenInclude(b => b.Items)
                .Include(p => p.Bill).ThenInclude(b => b.Payments)
                .FirstOrDefaultAsync(p => p.Id == paymentId)
                ?? throw new KeyNotFoundException("Payment not found.");

            payment.IsConfirmed = true;
            if (staffId.HasValue) payment.ConfirmedByStaffId = staffId.Value;

            // If balance is fully paid, mark bill as Paid
            var bill = payment.Bill;

            if (bill.BalanceDue <= 0)
                bill.Status = BillStatus.Paid;

            await _db.SaveChangesAsync();

            return MapToDto(payment);
        }

        public async Task<List<PaymentResponseDto>> GetPaymentsForBillAsync(int billId)
        {
            var payments = await _db.Payments
                .Where(p => p.BillId == billId)
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();

            return payments.Select(MapToDto).ToList();
        }

        public async Task<CashierReportDto> GetCashierReportAsync(DateTime? startDate, DateTime? endDate)
        {
            if (startDate.HasValue && endDate.HasValue && startDate > endDate)
                throw new InvalidOperationException("Start date must be earlier than end date.");

            var query = _db.Payments
                .AsNoTracking()
                .Where(p => p.IsConfirmed)
                .Include(p => p.Bill)
                .ThenInclude(b => b.Patient)
                .Include(p => p.ConfirmedByStaff)
                .AsQueryable();

            if (startDate.HasValue)
                query = query.Where(p => p.PaidAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(p => p.PaidAt <= endDate.Value);

            var payments = await query
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();

            var totalCollected = payments.Sum(p => p.Amount);
            var totalTransactions = payments.Count;

            return new CashierReportDto
            {
                StartDate = startDate,
                EndDate = endDate,
                TotalCollected = totalCollected,
                TotalTransactions = totalTransactions,
                AverageTransactionAmount = totalTransactions > 0 ? totalCollected / totalTransactions : 0,
                PaymentMethodSummary = payments
                    .GroupBy(p => string.IsNullOrWhiteSpace(p.Method) ? "Unknown" : p.Method.Trim())
                    .Select(g => new CashierPaymentMethodSummaryDto
                    {
                        Method = g.Key,
                        Count = g.Count(),
                        Amount = g.Sum(x => x.Amount)
                    })
                    .OrderByDescending(x => x.Amount)
                    .ToList(),
                Transactions = payments.Select(p => new CashierTransactionDto
                {
                    PaymentId = p.Id,
                    BillNumber = p.Bill.BillNumber,
                    PatientName = p.Bill.Patient.FullName,
                    Method = p.Method,
                    Amount = p.Amount,
                    PaidAt = p.PaidAt,
                    Reference = p.Reference,
                    ConfirmedBy = p.ConfirmedByStaff != null ? p.ConfirmedByStaff.FullName : "System"
                }).ToList()
            };
        }

        private static PaymentResponseDto MapToDto(Payment p) => new()
        {
            Id = p.Id,
            Amount = p.Amount,
            Method = p.Method,
            IsConfirmed = p.IsConfirmed,
            PaidAt = p.PaidAt,
            Reference = p.Reference
        };
    }
}
