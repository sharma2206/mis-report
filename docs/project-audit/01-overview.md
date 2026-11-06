# 01. Project Overview

## Scope

This project is a Laravel-based hospital information and MIS reporting application with a React frontend and a MySQL-backed data layer. The codebase suggests a reporting and analytics platform for hospital operational data, with support for branch and tenant-aware dashboards, RBAC, and import-driven MIS processing.

## Current state

The project contains a strong and modern foundation in several areas:

- Laravel 12 backend with PHP 8.2
- React 19 frontend with Vite 7
- MySQL as the main persistence layer
- Sanctum-based authentication for a SPA
- RBAC tables, user management, branch access logic, and tenant context
- Import and export workflows for MIS, billing, admissions, collections, and surgery-related records
- Queue-based processing and report export capability

At the same time, the application is not yet in a stable production-ready condition. The highest priority issue is not a missing feature—it is a confirmed runtime defect in the authentication/access control layer.

## What is implemented

### Backend

The backend includes:

- `AuthController` for login, logout, and authenticated user retrieval
- `UserController` for user lifecycle and management actions
- `RbacController` for roles, permissions, and assignment flows
- `MISController` for uploads, imports, dashboard data, report exports, and rollback actions
- `AnalyticsController` and related controllers for KPI and drill-insight queries
- `OperationalController` for operational monitoring and branch-limited views

### Frontend

The frontend includes:

- Vite + React SPA setup
- Redux Toolkit state management
- React Query or equivalent data-fetch layering
- Axios request client with cookie-based auth support
- Route-level UI protection and permission-aware screens

### Data model and reporting

Data models and imports cover:

- billing items
- cashier collections
- admissions
- discharges and surgical records
- package consumption
- KPI definitions
- audit logs
- branch and tenant metadata

This shows a deliberate MIS and operational intelligence architecture.

## What is not yet reliable

The current codebase reveals a mismatch between intended architecture and actual runtime behavior.

The most important active issue is:

- route middleware is referenced in `routes/api.php`
- the alias registration for that middleware is commented out in `bootstrap/app.php`
- protected routes therefore fail at runtime

This undermines the integrity of the entire access model.

## Overall audit conclusion

This is a partially implemented but promising system. The project has a meaningful structure and a useful domain model, but the auth/RBAC layer is currently broken, and the app cannot be trusted as functional until that layer is repaired and validated.
