# 🏥 Digital Hospital Billing Interface System

> A web-based patient billing portal built with **ASP.NET Core (Razor Pages)** — bringing transparency, speed, and simplicity to hospital payment processes.

---

## 👥 Team Members

| Student ID | Name |
|------------|------|
| 26262 | Keza Ketsia |
| 26971 | Mukamisha Kevine |
| 26138 | Shema Ryan |
| 26139 | Uwayo Olga |

---

## 📋 Table of Contents

- [Background](#background)
- [Problem Statement](#problem-statement)
- [Proposed Solution](#proposed-solution)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Expected Outcomes](#expected-outcomes)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## 📖 Background

Healthcare facilities increasingly rely on digital billing systems to manage patient payments and financial records. However, these systems are primarily designed for **internal hospital use** and are not directly accessible to patients.

As a result, patients depend on physical interactions at cashier points to receive billing information and make payments — creating inefficiencies, long queues, and a lack of transparency.

---

## ❗ Problem Statement

Hospitals already have existing billing systems, but these are built for administrative use and are **not patient-facing**. This creates several challenges:

- Patients cannot view their charges in advance or understand cost breakdowns
- Patients must physically visit cashier points to confirm and pay bills
- Long waiting times, congestion, and billing confusion are common
- Most hospital billing systems are not designed to connect with external interfaces

> There is therefore a need for a simple, accessible web-based solution that connects to existing hospital billing systems, improves transparency, and enhances the overall patient payment experience — **without replacing current infrastructure**.

---

## 💡 Proposed Solution

This project proposes the development of a **web-based patient billing interface**, built using **ASP.NET Core (Razor Pages)**. The system is accessible from any device via a web browser — phones, tablets, and desktops — eliminating the need for a dedicated mobile app installation.

Hospital staff continue using existing systems to input services, tests, and charges. The web application retrieves this data and displays it clearly to patients via a secure, browser-based portal.

### Patients will be able to:

- ✅ View their total bill in real time via a unique Bill ID or QR code scan
- ✅ See a clear, itemized breakdown of charges
- ✅ Review billing information before reaching the cashier
- ✅ Present their Bill ID or QR code at the cashier for fast processing
- ✅ Download or print a digital receipt after payment

The system integrates with existing hospital billing databases through **secure APIs or direct database queries** — requiring minimal changes to current infrastructure.

---

## ⚙️ Key Features

| Feature | Description |
|--------|-------------|
| 🌐 Real-time bill access | View bills via any web browser — no app installation needed |
| 🧾 Itemized billing breakdown | Clear, line-by-line cost descriptions per service |
| 📱 QR Code & Bill ID | Generated per visit for fast cashier verification |
| 📄 Digital receipt (PDF) | Auto-generated and downloadable after payment |
| 🔐 Secure authentication | Login via visit number + date of birth |
| 🖥️ Cashier dashboard | Confirm payments and update bill status in real time |
| 🏥 Multi-hospital support | Configurable integration across different facilities |
| 📐 Responsive design | Optimized for mobile, tablet, and desktop browsers |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | ASP.NET Core (Razor Pages) |
| Language | C# |
| Frontend | HTML, CSS (Bootstrap / Tailwind), JavaScript |
| Database | SQL Server / existing hospital DB |
| Hosting | Hospital server or Azure cloud |
| Authentication | ASP.NET Core Identity / token-based access |

---

## 📈 Expected Outcomes

- ⏱️ Reduced waiting time at cashier points
- 💡 Improved patient understanding of billing charges
- 🔍 Enhanced transparency and trust in hospital payments
- 😊 Better patient experience and satisfaction
- ⚡ Efficient payment processing through quick Bill ID lookup
- 🔁 Scalable and reusable across multiple healthcare facilities

---

## 🚀 Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- SQL Server (local or remote)
- Visual Studio 2022 or VS Code

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/patient-billing-system.git

# Navigate to the project folder
cd patient-billing-system

# Restore dependencies
dotnet restore

# Apply database migrations
dotnet ef database update

# Run the application
dotnet run
```

Then open your browser at `https://localhost:5001`

---

## 📁 Project Structure

```
patient-billing-system/
├── Pages/
│   ├── Login.cshtml          # Patient login page
│   ├── Bill.cshtml           # Bill summary + QR code
│   ├── Breakdown.cshtml      # Itemized charge details
│   ├── Receipt.cshtml        # Downloadable receipt
│   └── Cashier/
│       └── Dashboard.cshtml  # Cashier payment confirmation
├── Models/
│   ├── Patient.cs
│   ├── Bill.cs
│   └── BillItem.cs
├── Services/
│   ├── BillingService.cs
│   └── QRCodeService.cs
├── Data/
│   └── AppDbContext.cs
├── wwwroot/                  # Static assets (CSS, JS, images)
└── appsettings.json          # Configuration & connection strings
```

---

## 📄 License

This project was developed for academic purposes as part of a university software engineering module.

---

*Built with ❤️ by Team 26 — bridging the gap between hospital systems and patients.*

