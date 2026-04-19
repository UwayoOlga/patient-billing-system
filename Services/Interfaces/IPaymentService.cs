using HospitalBilling.DTOs;

namespace HospitalBilling.Services.Interfaces
{
    public interface IPaymentService
    {
        // Record a payment (billing staff)
        Task<PaymentResponseDto> RecordPaymentAsync(PaymentDto dto, int staffId);

        // Confirm a payment (billing staff)
        Task<PaymentResponseDto> ConfirmPaymentAsync(int paymentId, int staffId);

        // Get payments for a bill
        Task<List<PaymentResponseDto>> GetPaymentsForBillAsync(int billId);
    }
}
