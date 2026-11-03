<?php

namespace App\Support;

/**
 * Permissions implied by the legacy users.role column.
 *
 * Used only when the user has no active RBAC role assignment.
 * Once a role is assigned, HasRoles uses that role's permissions instead.
 *
 * Keep in sync with resources/js/utils/legacyPermissions.js.
 */
final class LegacyRolePermissions
{
    /** Pages a viewer can open today. */
    private const VIEWER = [
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

    /** Staff adds imports, BRM, and the operational centre. */
    private const STAFF_EXTRA = [
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

    /** Manager adds finance and branch comparison. */
    private const MANAGER_EXTRA = [
        'financial.view',
        'financial.export',
        'financial.print',
        'dashboard.drill_down',
        'brm_report.print',
        'operational.export',
    ];

    public static function for(?string $role): array
    {
        return match ($role) {
            'viewer'  => self::VIEWER,
            'staff'   => array_values(array_unique([...self::VIEWER, ...self::STAFF_EXTRA])),
            'manager' => array_values(array_unique([...self::VIEWER, ...self::STAFF_EXTRA, ...self::MANAGER_EXTRA])),
            default   => [],
        };
    }
}
