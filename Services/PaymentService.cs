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

        public async Task<PaymentResponseDto> RecordPaymentAsync(PaymentDto dto, int staffId)
        {
            var bill = await _db.Bills.FindAsync(dto.BillId)
                ?? throw new KeyNotFoundException("Bill not found.");

            if (bill.Status != BillStatus.Finalized && bill.Status != BillStatus.Paid)
                throw new InvalidOperationException("Bill must be finalized before recording payment.");

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

        public async Task<PaymentResponseDto> ConfirmPaymentAsync(int paymentId, int staffId)
        {
            var payment = await _db.Payments
                .Include(p => p.Bill)
                .FirstOrDefaultAsync(p => p.Id == paymentId)
                ?? throw new KeyNotFoundException("Payment not found.");

            payment.IsConfirmed = true;
            payment.ConfirmedByStaffId = staffId;

            // If balance is fully paid, mark bill as Paid
            var bill = payment.Bill;
            await _db.Entry(bill).Collection(b => b.Payments).LoadAsync();

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
