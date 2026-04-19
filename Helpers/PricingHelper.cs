using HospitalBilling.Enums;
using HospitalBilling.Data;

namespace HospitalBilling.Helpers
{
    public static class PricingHelper
    {
        public static decimal GetStandardRate(BillItemCategory category, AppDbContext db)
        {
            // Map the enum category to the name-based categories managed by the Admin
            string lookupName = category switch
            {
                BillItemCategory.ConsultationFee => "General Consultation",
                BillItemCategory.Diagnosis => "Diagnosis Card",
                BillItemCategory.LabTest => "Standard Lab Test",
                BillItemCategory.PrescribedTest => "Standard Lab Test",
                BillItemCategory.Medication => "Standard Pharmacy Item",
                _ => ""
            };

            if (string.IsNullOrEmpty(lookupName)) return 0;

            var config = db.ServiceCategories
                .FirstOrDefault(sc => sc.Name == lookupName && sc.IsActive);

            return config?.BasePrice ?? 0;
        }
    }
}
