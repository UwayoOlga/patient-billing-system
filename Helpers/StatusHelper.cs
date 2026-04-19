using HospitalBilling.Enums;

namespace HospitalBilling.Helpers
{
    public static class StatusHelper
    {
        public static bool CanAddItems(BillStatus status) => status == BillStatus.Open;

        public static bool CanFinalize(BillStatus status) => status == BillStatus.Open;

        public static bool CanPay(BillStatus status) =>
            status == BillStatus.Finalized || status == BillStatus.Paid;

        public static bool CanDispute(BillStatus status) =>
            status == BillStatus.Finalized || status == BillStatus.Paid;
    }
}
