namespace HospitalBilling.Helpers
{
    /// <summary>
    /// Generates a QR code payload URL that encodes the bill number.
    /// The frontend uses this URL to redirect patients to their bill view.
    /// </summary>
    public static class QRCodeHelper
    {
        public static string GenerateQRPayload(string billNumber, string baseUrl)
        {
            // Returns a URL like: https://yourhospital.com/bill?id=BILL-20260416-ABC123
            return $"{baseUrl.TrimEnd('/')}/bill?id={Uri.EscapeDataString(billNumber)}";
        }
    }
}
