# HIMS RBAC Audit & Re-Architecture Report

## 1. Current authentication mechanism

- Backend authentication is built on Laravel Sanctum, which matches a first-party React SPA setup.
- The app uses cookie-based stateful SPA auth (`withCredentials: true` + Sanctum CSRF cookie), not JWT.
- The login flow is in `App\Http\Controllers\Api\AuthController` and the frontend login flow calls `/sanctum/csrf-cookie` before submitting `/api/v1/auth/login`.
- Session persistence is handled using Laravel session cookies and the Sanctum stateful API middleware.
- Main issues:
    - the UI auth store depends on `localStorage` as the main truth instead of server-backed session restoration;
    - the interceptors auto-logout users on any `401`, even though the correct behavior is to log out only on an expired/invalid session;
    - `403` responses were being treated like auth failures in the frontend, which caused confusing UX and false logout behavior.

## 2. Current role and permission structure

The project already contains a normalized RBAC schema in migrations:

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `user_branches`
- `user_departments`
- `permission_groups`

This is good and should be retained.

However, the application still has legacy/unsafe behavior:

- `users.role` is still used as a legacy permission source in `App\Models\Traits\HasRoles` and `LegacyRolePermissions.php`.
- `User::isAdmin()` hardcodes legacy role names and does legacy admin bypass logic.
- `User::getAllPermissions()` mixes RBAC permissions with legacy column fallback, which is not a clean authorization boundary.
- The auth payload returns only a legacy `role` plus a list of permissions with no normalized branch/department scope in the contract.
- There are duplicate patterns for authorization checks: middleware, trait methods, JS `legacyPermissions.js`, and route-level middleware checks.

## 3. Incorrect or duplicate implementations

### Incorrect / risky

- `User::isAdmin()` uses string matching against `users.role` plus RBAC role slug values.
- `HasRoles::getAllPermissions()` returns `['*']` for admin users and otherwise falls back to `LegacyRolePermissions::for($this->role)` when no role is assigned.
- `CheckPermission` reimplements permission enforcement and also depends on legacy RBAC assumptions.
- Frontend `resources/js/hooks/usePermissions.js` and `resources/js/utils/legacyPermissions.js` are still a second authorization source, which can drift from the backend.
- `resources/js/store/authSlice.js` stores session user state in `localStorage` without a server-side refresh path.
- `resources/js/services/api.js` logs users out on `401` and `403` is not treated independently.

### Duplicate implementations to replace or reduce

- `app/Support/LegacyRolePermissions.php`
- `resources/js/utils/legacyPermissions.js`
- legacy role fallback logic inside `App\Models\Traits\HasRoles`
- duplicated permission evaluation logic in UI utilities and middleware
- `CheckPermission` as a broad custom permission gate instead of a centralized service plus native Laravel authorization

## 4. Files to retain vs replace

### Keep

- `database/migrations/2026_07_08_200001_create_rbac_tables.php`
- `database/migrations/2026_07_08_300002_create_user_management_tables.php`
- `app/Models/Role.php`
- `app/Models/Permission.php`
- `app/Models/User.php` (keep but reduce legacy role usage)
- `app/Http/Controllers/Api/AuthController.php` (updated to normalize auth payload)
- `routes/api.php` (route grouping is valid and should be retained)
- `config/sanctum.php`

### Replace or refactor

- `app/Models/Traits/HasRoles.php`
- `app/Http/Middleware/CheckPermission.php`
- `app/Http/Middleware/EnsureUserIsActive.php`
- `app/Http/Middleware/CheckBranchAccess.php`
- `resources/js/store/authSlice.js`
- `resources/js/services/api.js`
- `resources/js/hooks/usePermissions.js`
- `resources/js/routes/index.jsx`
- any UI components depending on `legacyPermissions.js`

## 5. Dependencies between modules

- Auth depends on Sanctum and the user model.
- User assignment depends on `user_roles`, `user_branches`, and `user_departments`.
- Permission checks depend on `roles`, `permissions`, and `role_permissions`.
- Route authorization depends on the middleware stack and the centralized auth service.
- Frontend RBAC depends entirely on the user payload returned by `/api/auth/me` and `/api/auth/login`.
- Branch/department restrictions must be validated server-side and trusted only after backend validation.

## 6. Recommended target architecture

### Backend

- Keep Laravel Sanctum as the SPA auth mechanism.
- Standardize auth endpoints to:
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/me`
- Use a centralized `AuthorizationService` to resolve effective roles and permissions.
- Use middleware responsibilities:
    - authenticated session
    - active user validation
    - branch access validation
    - department access validation
    - role/permission checks
    - user context resolution
- Use policies/gates for resource-specific authorization when needed.
- Treat `user_roles` and `role_permissions` as the source of truth, not the legacy `users.role` string.
- Never persist permission logic in the frontend as the authoritative source.

### Frontend

- Use Redux auth state only for session state and user profile data.
- Refresh user data from `/api/auth/me` after app initialization.
- Do not auto-logout on `403`.
- Centralize permission helpers around normalized user data.
- Keep protected routes server-guarded and UI-guarded only as UX, not security.

## 7. Implementation status

Completed in this workspace:

- normalized auth user contract in `AuthController`
- centralized `AuthorizationService`
- new middleware aliases and context middleware
- frontend auth state and API client fix
- route protection moved to normalized permission checks
- audit report saved to `docs/rbac-audit-report.md`

This is the clean baseline to continue with the full role/permission management module, user management, and branch/department enforcement work described in the original project brief.
