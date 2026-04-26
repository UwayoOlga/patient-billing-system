# Backend API Notes

The backend API is grouped by responsibility:

- Authentication and staff management handle user access and role assignment.
- Patient endpoints support registration and patient profile information.
- Billing endpoints coordinate bills, bill items, urgency, status, and charges.
- Payment endpoints record payment activity and support payment processing.
- Dispute endpoints track billing disputes and their review status.
- Reporting endpoints provide finance and activity data for dashboards.

Controllers should stay focused on request handling. Shared workflow logic should
remain in services so validation and business behavior are easier to maintain.
