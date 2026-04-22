using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalBilling.Models
{
    public class Prescription
    {
        [Key]
        public int Id { get; set; }

        public int BillId { get; set; }
        [ForeignKey("BillId")]
        public Bill? Bill { get; set; }

        [Required]
        [MaxLength(200)]
        public string DrugName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Dosage { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Frequency { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Duration { get; set; } = string.Empty;

        // 0 = Pending, 1 = Dispensed
        public int Status { get; set; } = 0;

        public int PrescribedByStaffId { get; set; }
        [ForeignKey("PrescribedByStaffId")]
        public Staff? PrescribedByStaff { get; set; }

        public DateTime PrescribedAt { get; set; } = DateTime.UtcNow;

        // Dispensing Details
        public int? DispensedByStaffId { get; set; }
        [ForeignKey("DispensedByStaffId")]
        public Staff? DispensedByStaff { get; set; }

        public DateTime? DispensedAt { get; set; }

        public int? BillItemId { get; set; }
        [ForeignKey("BillItemId")]
        public BillItem? BillItem { get; set; }
    }
}
