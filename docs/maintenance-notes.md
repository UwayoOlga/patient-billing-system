# Maintenance Notes

Keep routine maintenance changes small and easy to review.

## Suggested Habits

- Build the backend after changing controllers, services, models, or migrations.
- Build the frontend after changing dashboard pages, shared components, or API
  helpers.
- Keep migrations committed with the model changes that require them.
- Prefer shared helpers when a workflow is used in more than one dashboard.

Small, focused changes make it easier to confirm that hospital workflows still
behave as expected.
