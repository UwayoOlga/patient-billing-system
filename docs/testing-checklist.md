# Testing Checklist

Use this checklist before demoing or submitting changes.

## Backend

- Build the .NET project successfully.
- Confirm database migrations are in the expected order.
- Test authentication with at least one valid staff account.
- Verify key billing, payment, and dispute endpoints respond as expected.

## Frontend

- Install dependencies with `npm ci`.
- Build the Vite app successfully.
- Test login and navigation for each supported role.
- Confirm dashboard data loads without browser console errors.
