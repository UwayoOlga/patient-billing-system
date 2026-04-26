# Environment Notes

The application uses separate backend and frontend development environments.

## Backend

Backend configuration is stored in `appsettings.json` and
`appsettings.Development.json`. Development-specific settings should stay in the
development file where possible.

## Frontend

The frontend is served by Vite during development. API connection settings should
stay centralized so dashboards do not each define their own request behavior.
