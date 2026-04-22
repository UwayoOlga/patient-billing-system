namespace HospitalBilling.Models
{
    public class ServiceCategory
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. "General Consultation", "Standard Lab Test"
        public decimal BasePrice { get; set; }
        public HospitalBilling.Enums.StaffRole ResponsibleRole { get; set; } // Staff role responsible for this service
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int? StockQuantity { get; set; }
    }
}
