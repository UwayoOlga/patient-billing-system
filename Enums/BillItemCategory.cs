namespace HospitalBilling.Enums
{
    public enum BillItemCategory
    {
        // Doctor
        ConsultationFee,
        Diagnosis,
        PrescribedTest,
        Procedure,

        // Lab Technician
        LabTest,

        // Pharmacist
        Medication,

        // Nurse / Ward Staff
        BedCharge,
        NursingService,
        Consumable,

        // General
        Other
    }
}
