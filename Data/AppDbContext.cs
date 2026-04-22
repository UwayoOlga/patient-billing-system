using HospitalBilling.Models;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Patient> Patients => Set<Patient>();
        public DbSet<Staff> Staff => Set<Staff>();
        public DbSet<Bill> Bills => Set<Bill>();
        public DbSet<BillItem> BillItems => Set<BillItem>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<Dispute> Disputes => Set<Dispute>();
        public DbSet<BillingServiceConfig> ServiceConfigs => Set<BillingServiceConfig>();
        public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
        public DbSet<Prescription> Prescriptions => Set<Prescription>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Bill -> Patient
            modelBuilder.Entity<Bill>()
                .HasOne(b => b.Patient)
                .WithMany(p => p.Bills)
                .HasForeignKey(b => b.PatientId);

            // Bill -> FinalizedByStaff (optional)
            modelBuilder.Entity<Bill>()
                .HasOne(b => b.FinalizedByStaff)
                .WithMany()
                .HasForeignKey(b => b.FinalizedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Bill -> CreatedByStaff (optional — doctor or reception who opened the visit)
            modelBuilder.Entity<Bill>()
                .HasOne(b => b.CreatedByStaff)
                .WithMany()
                .HasForeignKey(b => b.CreatedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);


            // BillItem -> Bill
            modelBuilder.Entity<BillItem>()
                .HasOne(bi => bi.Bill)
                .WithMany(b => b.Items)
                .HasForeignKey(bi => bi.BillId);

            // BillItem -> Staff
            modelBuilder.Entity<BillItem>()
                .HasOne(bi => bi.AddedByStaff)
                .WithMany(s => s.BillItems)
                .HasForeignKey(bi => bi.AddedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<BillItem>()
                .HasOne(bi => bi.CompletedByStaff)
                .WithMany()
                .HasForeignKey(bi => bi.CompletedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Payment -> Bill
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Bill)
                .WithMany(b => b.Payments)
                .HasForeignKey(p => p.BillId);

            // Payment -> ConfirmedByStaff (optional)
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.ConfirmedByStaff)
                .WithMany()
                .HasForeignKey(p => p.ConfirmedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Dispute -> Bill
            modelBuilder.Entity<Dispute>()
                .HasOne(d => d.Bill)
                .WithMany(b => b.Disputes)
                .HasForeignKey(d => d.BillId);

            // Dispute -> ResolvedByStaff (optional)
            modelBuilder.Entity<Dispute>()
                .HasOne(d => d.ResolvedByStaff)
                .WithMany()
                .HasForeignKey(d => d.ResolvedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Prescription -> Bill
            modelBuilder.Entity<Prescription>()
                .HasOne(p => p.Bill)
                .WithMany()
                .HasForeignKey(p => p.BillId);

            // Prescription -> PrescribedByStaff
            modelBuilder.Entity<Prescription>()
                .HasOne(p => p.PrescribedByStaff)
                .WithMany()
                .HasForeignKey(p => p.PrescribedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Prescription -> DispensedByStaff
            modelBuilder.Entity<Prescription>()
                .HasOne(p => p.DispensedByStaff)
                .WithMany()
                .HasForeignKey(p => p.DispensedByStaffId)
                .OnDelete(DeleteBehavior.NoAction);

            // Decimal precision
            modelBuilder.Entity<BillItem>()
                .Property(bi => bi.UnitPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<BillingServiceConfig>()
                .Property(bsc => bsc.BasePrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<ServiceCategory>()
                .Property(sc => sc.BasePrice)
                .HasPrecision(18, 2);

            // Unique bill number
            modelBuilder.Entity<Bill>()
                .HasIndex(b => b.BillNumber)
                .IsUnique();

            // Unique staff email
            modelBuilder.Entity<Staff>()
                .HasIndex(s => s.Email)
                .IsUnique();
        }
    }
}
