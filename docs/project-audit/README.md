# Project Audit Index

This folder contains the repository-level technical audit for the HIMS/MIS application.

## Status

- Architecture review: complete
- Auth and RBAC review: complete
- Database and domain model review: complete
- Security and deployment review: complete
- Rebuild roadmap: complete

## Audit set

- 01-overview.md — application summary, scope, and current status
- 02-architecture-stack.md — backend, frontend, infrastructure, and runtime composition
- 03-auth-rbac-security.md — authentication, authorization, branch/tenant, and security findings
- 04-database-domain.md — schema, business domain, reporting, and data integrity considerations
- 05-performance-deployment.md — performance hotspots, scalability, operations, and deployment risks
- 06-roadmap.md — recommended rebuild and modernization sequence

## Critical finding

The most important active defect is the broken middleware alias registration in `bootstrap/app.php`. The application references middleware names such as `user.active`, `tenant`, `branch.access`, `permission`, and `role`, but the alias block is commented out. Laravel therefore cannot resolve the middleware for protected routes. This makes the auth and RBAC layer non-functional at runtime.

## Evidence summary

- `routes/api.php` applies protected middleware names to login, branch, analytics, RBAC, users, and MIS routes.
- `bootstrap/app.php` contains the alias registration block commented out.
- `tests/Feature/PermissionAccessTest.php` fails with `Target class [user.active] does not exist`.
- The app therefore has a confirmed runtime access-control defect even though the intended architecture is present.

## Recommended next action

Fix the middleware registration first, then validate the auth/RBAC flow before expanding the reporting or deployment work.
