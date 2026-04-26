using HospitalBilling.DTOs;

namespace HospitalBilling.Services.Interfaces
{
    public interface IPaymentService
    {
        // Record a payment
        Task<PaymentResponseDto> RecordPaymentAsync(PaymentDto dto, int? staffId);

        // Confirm a payment
        Task<PaymentResponseDto> ConfirmPaymentAsync(int paymentId, int? staffId);

        // Get payments for a bill
        Task<List<PaymentResponseDto>> GetPaymentsForBillAsync(int billId);

        // Cashier report within optional date-time range
        Task<CashierReportDto> GetCashierReportAsync(DateTime? startDate, DateTime? endDate);
    }
}
