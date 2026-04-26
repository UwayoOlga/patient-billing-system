namespace HospitalBilling.DTOs
{
    public class DoctorReportDto
    {
        public string DoctorName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalPatients { get; set; }
        public int TotalConsultations { get; set; }
        public int CompletedConsultations { get; set; }
        public int ActiveConsultations { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AverageConsultationValue { get; set; }
        public List<DoctorReportConsultationDto> Consultations { get; set; } = new();
        public List<DoctorReportDailyStatsDto> DailyStats { get; set; } = new();
        public List<DoctorReportServiceCategoryDto> ServiceBreakdown { get; set; } = new();
    }

    public class DoctorReportConsultationDto
    {
        public int BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public DateTime ConsultationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int ServicesCount { get; set; }
        public decimal TotalAmount { get; set; }
        public List<string> Services { get; set; } = new();
        public List<string> Prescriptions { get; set; } = new();
    }

    public class DoctorReportDailyStatsDto
    {
        public DateTime Date { get; set; }
        public int PatientsCount { get; set; }
        public int ConsultationsCompleted { get; set; }
        public decimal Revenue { get; set; }
    }

    public class DoctorReportServiceCategoryDto
    {
        public string Category { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Revenue { get; set; }
        public double Percentage { get; set; }
    }
}