using HospitalBilling.Data;
using HospitalBilling.Enums;
using Microsoft.EntityFrameworkCore;

namespace HospitalBilling.Services.BackgroundTasks
{
    public class BillCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BillCleanupService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Check every hour

        public BillCleanupService(IServiceProvider serviceProvider, ILogger<BillCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Bill Cleanup Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await AutoFinalizeStaleBills();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while auto-finalizing stale bills.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        private async Task AutoFinalizeStaleBills()
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // A bill is "stale" if it's been Open for more than 24 hours
            var staleThreshold = DateTime.UtcNow.AddHours(-24);

            var staleBills = await db.Bills
                .Where(b => b.Status == BillStatus.Open && b.CreatedAt < staleThreshold)
                .Include(b => b.Items)
                .ToListAsync();

            if (staleBills.Any())
            {
                _logger.LogInformation($"Auto-cleanup: Detected {staleBills.Count} stale clinical visits. Processing...");

                foreach (var bill in staleBills)
                {
                    // If there are pending lab tests or medications, we mark them as 'Abandoned' 
                    // so they don't stay in the Lab/Pharmacy work queues forever.
                    var pendingItems = bill.Items.Where(i => !i.IsCompleted).ToList();
                    foreach (var item in pendingItems)
                    {
                        item.Notes = (item.Notes ?? "") + " [System: Visit abandoned/closed after 24h]";
                        // Note: We leave IsCompleted = false so they are NOT billed to the patient.
                    }

                    bill.Status = BillStatus.Finalized;
                    bill.FinalizedAt = DateTime.UtcNow;
                    _logger.LogInformation($"Auto-finalized stale bill: {bill.BillNumber} for Patient ID {bill.PatientId}");
                }

                await db.SaveChangesAsync();
                _logger.LogInformation("Stale bill cleanup cycle completed successfully.");
            }
        }
    }
}
