# 02. Architecture and Stack Review

## Technology stack

### Backend

- Laravel 12
- PHP 8.2
- Sanctum for SPA auth
- MySQL for primary data storage
- Database queues for async processing
- Eloquent models and query scopes
- Custom repository/service concepts in some modules

### Frontend

- React 19
- Vite 7
- Redux Toolkit
- Axios
- React Router
- Charting libraries such as ECharts/Recharts

### Operational environment

- Session and queue are database-backed by default in config
- Cache and session settings are configured for a multi-environment deployment
- The project expects a hospital/tenant-aware runtime with operational data imported into branch-focused reporting tables

## Architectural pattern

The system is best described as a hybrid Laravel monolith with a React SPA frontend and analytics-heavy reporting domain logic.

This is not a clean DDD or service-oriented architecture yet, but it does show a clear intent toward modular separation:

- auth and user management
- RBAC and permission control
- tenant/branch context
- reporting and analytics
- import/export processing
- audit and operational modules

## Strengths

- Use of Laravel conventions and Eloquent patterns is consistent and maintainable
- Strong route organization
- Good separation between controller, model, and import logic in several modules
- Reporting and analytics domain has clear operational focus
- The codebase has a real attempt at multi-branch and multi-tenant awareness

## Weaknesses

### 1. Middleware wiring is broken

The application references middleware names in routes that are not actually registered at bootstrap time.

Relevant area:

- `routes/api.php`
- `bootstrap/app.php`

This is the most severe architectural defect because it breaks the intended security design.

### 2. Mixed auth/authorization paradigms

The project combines:

- legacy `users.role` checks
- new RBAC tables
- custom middleware permission validation
- UI-side permission logic

This creates multiple sources of truth for authorization.

### 3. Incomplete normalization of tenant and branch scope

The system has tenant and branch concepts, but those are used inconsistently across the application. Some routes enforce branch scope, some rely on `user.branch`, some use `userBranches`, some use role branch permissions, and some are route-parameter driven.

### 4. Hybrid frontend/backend access control

The frontend has UI route gating and permission utilities, but those are supplemental only. The true authorization boundary must remain on the server.

## Overall assessment

The architecture is promising but currently inconsistent. The stack is modern and capable, but the runtime security layer is not operational enough to support safe production usage.
