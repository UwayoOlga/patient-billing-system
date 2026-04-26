# Local Setup

## Backend

Run the backend from the repository root:

```powershell
dotnet restore
dotnet build HospitalBilling.csproj
dotnet run --project HospitalBilling.csproj
```

The development launch settings define the local API profile used by the .NET
application.

## Frontend

Run the frontend from `hospital-frontend/`:

```powershell
npm ci
npm run dev
```

The frontend is a Vite application, so the terminal output will show the local
browser URL after the development server starts.
