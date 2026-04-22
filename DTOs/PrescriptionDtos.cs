namespace HospitalBilling.DTOs
{
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
