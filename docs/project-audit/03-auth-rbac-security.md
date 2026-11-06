# 03. Authentication, RBAC, and Security Audit

## Authentication model

The app uses Laravel Sanctum with a SPA-style cookie-based flow. This is a viable choice for a React SPA and matches the existing frontend configuration.

The authentication model includes:

- `auth:sanctum` middleware on protected routes
- CSRF cookie acquisition in the frontend before login
- session-based stateful auth behavior
- authenticated user payload retrieval through `AuthController`

## Confirmed runtime defect

The application references middleware names such as:

- `user.active`
- `tenant`
- `branch.access`
- `permission`
- `role`

These are used in routes, but they are not registered in `bootstrap/app.php` because the alias block is commented out.

This leads to runtime failures such as:

- `Target class [user.active] does not exist.`

This has been confirmed through the project's feature test execution.

## RBAC implementation status

The project contains a normalized RBAC design with tables like:

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `user_branches`
- `user_departments`
- `permission_groups`

This is a positive sign and should remain the foundation for authorization.

However, the code still contains legacy authorization behavior tied to the `users.role` column:

- `User` model includes legacy role checks
- `HasRoles` trait mixes legacy and modern permission evaluation
- access checks are duplicated across traits, middleware, and frontend utilities

This creates a split source of truth and is not acceptable for a production-grade RBAC system.

## Security findings

### 1. Protected routes are not actually protected

Because the middleware aliases are missing, route protection fails before the app reaches the controller logic.

### 2. Legacy role fallback weakens security boundaries

If a user can be authorized by both legacy role strings and RBAC assignments, then the authorization logic may diverge. This creates inconsistencies and risk.

### 3. UI-side permission logic is not sufficient

The frontend has route gating and utilities for permission checks, but those are only UX. They cannot be used as the primary authorization mechanism.

### 4. Session and auth semantics are sensitive to lifecycle problems

The app uses cookies and session state. If the session lifecycle, CSRF, or route middleware registration is inconsistent, users may appear logged in but be unable to access protected resources.

## Security recommendation

The safest path is:

- fix middleware aliases
- standardize RBAC to one source of truth
- keep all authorization enforcement on the server
- treat frontend permission checks as display-only validation
- make branch and department access checks explicitly server-side for every protected route

## Audit conclusion

The app contains an intended RBAC architecture, but the implementation is currently broken at runtime due to middleware registration. This is the primary security blocker and must be fixed before further implementation or rollout.
