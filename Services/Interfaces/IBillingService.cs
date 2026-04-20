using HospitalBilling.DTOs;
using HospitalBilling.Enums;

namespace HospitalBilling.Services.Interfaces
{
    public interface IBillingService
    {
        // Get bills where the doctor added at least one item
        Task<List<BillDto>> GetBillsForDoctorAsync(int doctorId);
        // Registration staff opens a bill for a patient
        Task<BillDto> CreateBillAsync(CreateBillDto dto, int createdByStaffId);

        // Any staff adds a charge to a bill (role-validated)
        Task<BillItemDto> AddBillItemAsync(AddBillItemDto dto, int staffId, StaffRole staffRole);

        // Remove a bill item if mistake was made
        Task RemoveBillItemAsync(int billItemId, int staffId, StaffRole staffRole);

        // Lab tech marks a test as completed (billable) and attaches results
        Task MarkTestCompletedAsync(int billItemId, int staffId, string? resultNotes = null);

        // Lab tech reverts an accidentally completed test back to pending
        Task RevertTestCompletedAsync(int billItemId, int staffId);

        // Pharmacist dispenses medication and adjusts quantity
        Task DispenseMedicationAsync(int billItemId, int staffId, int quantity);

        // Nurse completes a doctor-ordered nursing item
        Task CompleteNursingOrderAsync(int billItemId, int staffId, int quantity, string? notes = null);

        // Billing staff finalizes the bill
        Task<BillDto> FinalizeBillAsync(int billId, int staffId);

        // Get full bill by ID (staff use)
        Task<BillDto?> GetBillByIdAsync(int billId);

        // Patient access: BillNumber only
        Task<BillDto?> GetBillByIdentifierAsync(string billNumber);

        // Patient history: all bills by phone number
        Task<List<BillDto>> GetBillsByPhoneAsync(string phoneNumber);

        // Get all bills (billing staff)
        Task<List<BillDto>> GetAllBillsAsync();

        // Delete a bill (doctor or billing staff)
        Task DeleteBillAsync(int billId, int staffId, StaffRole staffRole);

        // Get trash bills for a doctor
        Task<List<BillDto>> GetTrashBillsForDoctorAsync(int doctorId);

        // Restore a bill from trash
        Task RestoreBillAsync(int billId, int staffId);

        // Permanently delete a bill
        Task PermanentlyDeleteBillAsync(int billId, int staffId, StaffRole staffRole);
    }
}
