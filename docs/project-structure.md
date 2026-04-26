# Project Structure

This repository is organized as a full-stack hospital billing system.

## Backend

- `Program.cs` configures services, middleware, authentication, CORS, Swagger,
  and background jobs.
- `Controllers/` exposes the HTTP API used by the frontend.
- `Services/` keeps the core billing, payment, and dispute workflows outside of
  controllers.
- `Data/AppDbContext.cs` defines the Entity Framework database context.
- `Migrations/` tracks database schema changes over time.

## Frontend

- `hospital-frontend/src/pages/` contains the main dashboard and portal screens.
- `hospital-frontend/src/components/` contains reusable UI components.
- `hospital-frontend/src/utils/` contains shared API and authentication helpers.
- `hospital-frontend/public/` contains static assets served by Vite.
