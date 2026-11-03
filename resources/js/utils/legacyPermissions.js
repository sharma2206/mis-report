/**
 * Permissions implied by users.role when the session has no RBAC role list.
 * Keep in sync with app/Support/LegacyRolePermissions.php.
 */

const VIEWER = [
    'dashboard.view',
    'dashboard.export',
    'mis_report.view',
    'mis_report.export',
    'mis_report.print',
    'report_center.view',
    'doctors.view',
    'departments.view',
    'surgery.view',
    'pharmacy.view',
    'notifications.view',
];

const STAFF_EXTRA = [
    'import_center.view',
    'import_center.create',
    'import_center.import',
    'import_center.delete',
    'mis_report.import',
    'mis_report.email',
    'brm_report.view',
    'brm_report.export',
    'operational.view',
];

const MANAGER_EXTRA = [
    'financial.view',
    'financial.export',
    'financial.print',
    'dashboard.drill_down',
    'brm_report.print',
    'operational.export',
];

const unique = (...lists) => [...new Set(lists.flat())];

export function legacyPermissionsFor(role) {
    if (role === 'admin') return ['*'];
    if (role === 'manager') return unique(VIEWER, STAFF_EXTRA, MANAGER_EXTRA);
    if (role === 'staff') return unique(VIEWER, STAFF_EXTRA);
    if (role === 'viewer') return VIEWER;
    return [];
}

export function legacyCan(role, permission) {
    const perms = legacyPermissionsFor(role);
    if (perms.includes('*') || perms.includes(permission)) return true;
    const module = permission.split('.')[0];
    return perms.includes(`${module}.*`);
}
