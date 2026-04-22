using HospitalBilling.Data;
using HospitalBilling.Services;
using HospitalBilling.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// CORS — allow the React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<IBillingService, BillingService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IDisputeService, DisputeService>();

// Background Tasks
builder.Services.AddHostedService<HospitalBilling.Services.BackgroundTasks.BillCleanupService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseMiddleware<HospitalBilling.Middleware.ExceptionMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Seed Admin User
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    if (!db.Staff.Any(s => s.Email == "admin@hospital.rw"))
    {
        db.Staff.Add(new HospitalBilling.Models.Staff
        {
            FullName = "System Administrator",
            Email = "admin@hospital.rw",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("12345"),
            Role = HospitalBilling.Enums.StaffRole.Admin,
            IsActive = true
        });
        db.SaveChanges();
    }

    if (!db.Staff.Any(s => s.Email == "cashier@hospital.rw"))
    {
        db.Staff.Add(new HospitalBilling.Models.Staff
        {
            FullName = "System Cashier",
            Email = "cashier@hospital.rw",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("12345"),
            Role = HospitalBilling.Enums.StaffRole.Cashier,
            IsActive = true
        });
        db.SaveChanges();
    }

    // Seed Initial Service Categories if empty
    if (!db.ServiceCategories.Any())
    {
        db.ServiceCategories.AddRange(
            // Doctor Services
            new HospitalBilling.Models.ServiceCategory { Name = "General Consultation", BasePrice = 5000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Doctor, Description = "Standard checkup" },
            new HospitalBilling.Models.ServiceCategory { Name = "Specialist Consultation", BasePrice = 15000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Doctor, Description = "Consultation with a specialist" },
            new HospitalBilling.Models.ServiceCategory { Name = "Minor Surgery/Procedure", BasePrice = 50000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Doctor, Description = "Stitches, small incisions, etc." },
            
            // Lab Services
            new HospitalBilling.Models.ServiceCategory { Name = "Full Blood Count (FBC)", BasePrice = 4500, ResponsibleRole = HospitalBilling.Enums.StaffRole.LabTech, Description = "Comprehensive blood analysis" },
            new HospitalBilling.Models.ServiceCategory { Name = "Malaria RDT", BasePrice = 2000, ResponsibleRole = HospitalBilling.Enums.StaffRole.LabTech, Description = "Rapid Diagnostic Test for Malaria" },
            new HospitalBilling.Models.ServiceCategory { Name = "Urinalysis", BasePrice = 3000, ResponsibleRole = HospitalBilling.Enums.StaffRole.LabTech, Description = "Urine sample testing" },
            
            // Pharmacy Services
            new HospitalBilling.Models.ServiceCategory { Name = "Standard Antibiotic Pack", BasePrice = 12000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Pharmacist, Description = "Basic antibiotic course" },
            new HospitalBilling.Models.ServiceCategory { Name = "Pain Relief Package", BasePrice = 3000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Pharmacist, Description = "Selection of common analgesics" },
            
            // Nurse Services
            new HospitalBilling.Models.ServiceCategory { Name = "Inpatient Bed (General)", BasePrice = 15000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Nurse, Description = "Per night stay in general ward" },
            new HospitalBilling.Models.ServiceCategory { Name = "Nursing Care Service", BasePrice = 5000, ResponsibleRole = HospitalBilling.Enums.StaffRole.Nurse, Description = "General nursing assistance and monitoring" },
            
            // Administrative
            new HospitalBilling.Models.ServiceCategory { Name = "New Patient File", BasePrice = 2500, ResponsibleRole = HospitalBilling.Enums.StaffRole.Admin, Description = "Registration fee for new patients" }
        );
        db.SaveChanges();
    }
}

app.Run();
