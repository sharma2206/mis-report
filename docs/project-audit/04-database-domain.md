# 04. Database, Domain Model, and Business Logic Review

## Database structure

The project includes a sizable and domain-specific schema set centered around hospital operations and MIS reporting. Models include, for example:

- `BillItem`
- `CashierCollection`
- `ErAdmission`
- `IpAdmission`
- `PackageConsumption`
- `SurgeryImport`
- `HospitalBranch`
- `Tenant`
- `Role`
- `Permission`
- `User`
- `AuditLog`

This indicates a strong reporting domain built around imported operational datasets and branch-specific hospital metrics.

## Data model strengths

- Clear hospital domain names around billing, admissions, surgery, and collections
- Branch- and tenant-aware design in the newer models and migrations
- Eloquent scopes for filtering and date/branch slicing
- Import pipeline structure for high-volume hospital data
- Audit and notification support

## Data model risks

### 1. Mixed legacy and new schema assumptions

The app appears to blend older `users.role` conventions with newer RBAC tables and tenant-based access. This can create inconsistent behavior across modules.

### 2. Branch and tenant logic is partly encoded in multiple places

The system stores branch information in different forms or contexts:

- `user.branch`
- `userBranches`
- `HospitalBranch`
- `RoleBranch`
- route parameters

This complexity must be normalized or the app will produce inconsistent access results.

### 3. Reporting datasets may scale poorly without explicit performance validation

Hospital operational datasets can become large quickly. Query scopes are present, but the actual performance profile of these queries needs validation under realistic large-volume data.

## Business logic observations

The application is oriented toward operational reporting rather than full EMR workflows.

The business logic appears to revolve around:

- monthly and daily KPI reporting
- branch comparisons
- billing summaries
- admission and surgery statistics
- operational and department performance metrics
- import validation with dashboard summary output

This is a realistic MIS-oriented scope, but it is broader than a classic CRUD application and needs disciplined data quality controls.

## Data integrity considerations

The import and reporting flows are powerful and central to the application. To operate safely, the project must validate:

- duplicate record detection
- date normalization
- branch context consistency
- tenant scoping for all imported rows
- audit traceability for report generation and rollbacks

## Conclusion

The project has meaningful domain modeling and reporting architecture, but it needs a clear normalization phase to reconcile legacy fields, tenant logic, branch logic, and RBAC source-of-truth decisions.
