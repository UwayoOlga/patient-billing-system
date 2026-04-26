# Frontend Notes

The frontend is organized around role-specific dashboards and shared components.

## Main Areas

- Landing and login screens introduce the system and authenticate users.
- Admin, billing, doctor, nurse, lab, pharmacy, and receptionist dashboards
  provide role-specific views.
- The patient portal gives patients access to their own billing and profile
  information.
- Shared components keep repeated UI such as profile and payment flows in one
  place.

## API Access

Frontend API calls should use the shared helpers in `src/utils/` so request
configuration and authentication behavior stay consistent.
