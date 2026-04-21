using System.ComponentModel.DataAnnotations;
using HospitalBilling.Enums;

namespace HospitalBilling.DTOs
{
    public class AddBillItemDto
    {
        [Required]
        public int BillId { get; set; }

        [Required]
        public BillItemCategory Category { get; set; }

        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Description { get; set; } = string.Empty;

        [Range(0, 1000000)]
        public decimal UnitPrice { get; set; }

        [Range(1, 1000)]
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

    public class CompleteNursingOrderDto
    {
        public int Quantity { get; set; } = 1;
        public string? Notes { get; set; }
    }
}
