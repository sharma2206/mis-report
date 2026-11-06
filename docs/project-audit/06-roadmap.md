# 06. Rebuild and Modernization Roadmap

## Phase 1 — Secure the baseline

The first priority is to make the application stable and secure enough to trust.

Required actions:

- register all middleware aliases in `bootstrap/app.php`
- validate auth flows for login/logout/me
- fix route protection for all protected endpoints
- confirm tenant and branch middleware are resolving correctly
- add a minimal test suite for auth and access control

Outcome:

- users can authenticate successfully
- protected routes are enforced consistently
- unauthorized access is blocked by the server

## Phase 2 — Normalize RBAC and user authorization

The next priority is to reduce ambiguity in the auth model.

Required actions:

- choose `user_roles` and `role_permissions` as the canonical RBAC source
- reduce or remove legacy `users.role` authorization fallback
- centralize permission evaluation in one service or policy layer
- ensure branch and department access are enforced in the backend

Outcome:

- one source of truth for authorization
- fewer inconsistent permission edge cases
- cleaner policy enforcement across controllers and routes

## Phase 3 — Tenant and branch access hardening

Required actions:

- normalize branch-scoping logic across the app
- validate `user.branch`, `userBranches`, and `RoleBranch` behavior
- make tenant-context resolution explicit and centralized
- define behavior for unrestricted users vs restricted users

Outcome:

- consistent access across analytics, reports, and MIS endpoints
- clean multi-branch operation

## Phase 4 — Reporting and import stabilization

Required actions:

- validate imported data quality, duplicate detection, and reconciliation logic
- review dashboard aggregation queries
- check export pipelines for correctness and performance
- audit rollback and import-log flows

Outcome:

- trustworthy MIS dashboards and imported operational data
- stronger reporting integrity

## Phase 5 — Performance and operational hardening

Required actions:

- add indexing where needed
- review heavy analytic queries
- validate queue worker throughput
- establish monitoring and alerting for failed report jobs
- tune export and PDF generation workloads

Outcome:

- performance stability under realistic volume
- operational visibility and resilience

## Phase 6 — Production readiness

Required actions:

- deploy-time environment hardening
- cookie domain and CSRF validation audit
- security review of all public API endpoints
- audit-log retention and review process
- deployment runbook and rollback strategy

Outcome:

- secure and repeatable production deployment
- auditable operations and controlled rollout

## Final recommendation

The project should not be treated as a finished system. It should be treated as a partially implemented but high-potential MIS platform that requires a disciplined security-first recovery and rebuild sequence.

The first actionable milestone is simple:

- fix middleware registration
- validate auth/RBAC
- then proceed to the structured modernization roadmap above
