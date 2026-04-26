namespace HospitalBilling.Enums
{
    public enum BillStatus
    {
        Open,       // Bill is being built, charges still being added
        Finalized,  // Billing staff has reviewed and locked the bill
        Paid,       // Payment confirmed
        Disputed,   // Patient has raised a dispute
        Cancelled,
        Trash,
        ConsultationDone // Added at the end to preserve integer mapping for existing records
    }
}
