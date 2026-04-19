using HospitalBilling.Enums;

namespace HospitalBilling.DTOs
{
    public class AddBillItemDto
    {
        public int BillId { get; set; }
        public BillItemCategory Category { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;
        public string? Notes { get; set; }
    }

    // Lab tech can mark a test as completed, optionally providing clinical results
    public class MarkTestCompletedDto
    {
        public string? ResultNotes { get; set; }
    }

    public class DispenseMedicationDto
    {
        public int Quantity { get; set; }
    }
}
