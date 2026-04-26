using HospitalBilling.Models;

namespace HospitalBilling.DTOs
{
    public class PrescriptionDto
    {
        public int Id { get; set; }
        public int BillId { get; set; }
        public string? BillNumber { get; set; }
        public string? PatientName { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
        public string Frequency { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public int Status { get; set; }
        public string? PrescribedBy { get; set; }
        public DateTime PrescribedAt { get; set; }
    }

    public class CreatePrescriptionDto
    {
        public int BillId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
        public string Frequency { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
    }

    public class DispensePrescriptionDto
    {
        public int ServiceCategoryId { get; set; }
        public int Quantity { get; set; }
    }
}
