# Hospital Billing Management System
## Live Demo: https://hospital.ntwrkd.co.uk/
A professional healthcare billing and patient management system with comprehensive workflow automation, role-based access control, and integrated payment processing.

## Development Team

| Student ID | Name  
|------------|------ 
| 26262 | Keza Ketsia  
| 26971 | Mukamisha Kevine 
| 26138 | Shema Ryan 
| 26139 | Uwayo Olga 

## System Overview

Complete hospital billing solution covering patient registration, medical service billing, insurance processing, payment collection, and financial reporting. Features a secure patient portal and professional receipt generation.

## Key Features

- **Role-Based Access**: Doctors, Nurses, Lab Techs, Pharmacists, Cashiers, Receptionists, Admin, and Patients
- **Automated Billing**: Real-time charge capture for all medical services
- **Insurance Integration**: Automatic coverage calculation and patient liability
- **Patient Portal**: Secure bill viewing, payments, and receipt downloads
- **Professional Receipts**: Medical-grade PDF receipts for payments
- **Doctor Reports**: Comprehensive performance analytics and consultation tracking
- **Financial Analytics**: Revenue tracking and cashier reports
- **Dispute Management**: Patient billing complaint system

## Technology Stack

**Backend:** ASP.NET Core 10.0, Entity Framework Core, SQL Server, JWT Authentication  
**Frontend:** React 19.2.5, Vite, React Router v7, CSS Modules, jsPDF

## User Management

**IMPORTANT**: The System Administrator is responsible for creating ALL user accounts in the system. Staff members cannot self-register and must be created by the admin.

### Admin Credentials
```
Email: admin@hospital.rw
Password: 12345
```

### User Roles
- **Admin**: Creates all users, manages system settings, financial oversight
- **Medical Staff**: Doctors, Nurses, Lab Techs, Pharmacists
- **Administrative Staff**: Receptionists, Cashiers
- **Patients**: Can self-register or be registered by reception staff

### Patient Access Types (Dual-Access Model)

> [!IMPORTANT]
> The system provides two distinct ways for patients to access the portal. One requires authentication for full medical records, while the other provides guest access for quick payments.

#### 1. Registered Patient Access (Full Features)
- **Login Required**: Patients create accounts and login with email/phone and password
- **Full Portal Access**: Complete medical history, all bills, payment tracking
- **Enhanced Features**: 
  - View all past visits and bills
  - Download comprehensive medical reports
  - Manage profile and insurance information
  - Submit and track billing disputes
  - Access payment history across all visits
- **Security**: Secure account-based access with full data protection

#### 2. Guest Access via Bill ID (Limited Features)
- **No Login Required**: Patients use only their Bill Number (Visit ID) to access
- **Single Bill Access**: Can only view and pay for the specific bill
- **Limited Features**:
  - View single bill details and charges
  - Make payments for that specific bill
  - Download receipt for payments made
  - No access to medical history or other bills
- **Use Case**: Quick bill payment without account creation, emergency access

## Workflow Process

1. **Admin creates staff accounts** → Staff can login and perform their roles
2. **Patient Registration** → Reception staff or patient self-registration
3. **Medical Services** → Healthcare providers deliver care with automatic billing
4. **Service Completion** → Departments complete services (lab results, prescriptions)
5. **Bill Finalization** → Cashiers review and finalize bills
6. **Payment & Receipts** → Patients pay and download professional receipts

## Installation & Setup

### Prerequisites
- .NET 10.0 SDK
- SQL Server
- Node.js 18+ and npm

### Quick Start
```bash
# Backend
git clone [repository-url]
cd hospital-billing-system
dotnet restore
dotnet ef database update
dotnet run

# Frontend (new terminal)
cd hospital-frontend
npm install
npm run dev
```

### Access Points
- **API**: http://localhost:5253
- **Frontend**: http://localhost:3000
- **Patient Portal (Registered)**: http://localhost:3000/patient
- **Guest Bill Access**: http://localhost:3000/patient (enter Bill ID without login)

## Default Accounts

**System Administrator** (Creates all other users):
- Email: `admin@hospital.rw`
- Password: `12345`

**Test Cashier Account**:
- Email: `cashier@hospital.rw`
- Password: `12345`

> **Note**: All staff accounts must be created by the admin. Patients can self-register through the patient portal.

## Key Features Detail

### Doctor Dashboard
- Active consultations management
- Finish consultation workflow
- Comprehensive performance reports
- Patient history and prescription tracking

### Patient Portal
- **Registered Users**: Complete medical history, all bills, profile management
- **Guest Access**: Single bill viewing and payment via Bill ID (no login required)
- **Payment Methods**: Mobile Money, Bank Transfer
- **Receipt Downloads**: Instant PDF receipts after payment
- **Payment History**: Full transaction tracking (registered users only)
- **Billing Disputes**: Submit complaints and track resolution (registered users only)

### Admin Functions
- **User Management**: Create and manage all staff accounts
- **Financial Oversight**: Revenue reports and payment tracking
- **System Configuration**: Pricing, insurance settings
- **Audit Trails**: Complete system activity monitoring

## System Architecture

### Bill Lifecycle
1. **Open** → Active visit, services being added
2. **ConsultationDone** → Doctor finished consultation
3. **Finalized** → Ready for payment
4. **Paid** → Fully settled
5. **Disputed** → Under review

### Payment Processing
- Automatic payment confirmation for patient self-payments
- Professional receipt generation with hospital branding
- Complete payment history tracking
- Support for partial payments with receipt access

## Reporting System

- **Doctor Reports**: Consultation analytics, patient metrics, revenue tracking
- **Cashier Reports**: Daily collections, payment method breakdown
- **Patient Reports**: Visit history, insurance vs. patient costs
- **Admin Reports**: System-wide financial and operational analytics


## License

Educational project developed for academic purposes.

---

**Important**: Start by logging in as the admin to create staff accounts before testing other system features.
