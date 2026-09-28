<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RbacSeeder extends Seeder
{
    // ─── Permission Matrix ────────────────────────────────────────────────────

    private const GROUPS = [
        ['slug' => 'core_access',      'name' => 'Core Access',       'icon' => 'layout-dashboard', 'sort' => 1,
            'modules' => [
                'dashboard' => ['view', 'export', 'drill_down'],
            ],
        ],
        ['slug' => 'reports',          'name' => 'Reports',           'icon' => 'file-bar-chart',   'sort' => 2,
            'modules' => [
                'mis_report'  => ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'email', 'import', 'schedule'],
                'brm_report'  => ['view', 'export', 'print', 'email'],
                'financial'   => ['view', 'export', 'print'],
                'operational' => ['view', 'export', 'print'],
            ],
        ],
        ['slug' => 'analytics',        'name' => 'Analytics',         'icon' => 'trending-up',      'sort' => 3,
            'modules' => [
                'doctors'     => ['view', 'export', 'print'],
                'departments' => ['view', 'export', 'print'],
                'surgery'     => ['view', 'export', 'print'],
                'pharmacy'    => ['view', 'export', 'print'],
            ],
        ],
        ['slug' => 'data_management',  'name' => 'Data Management',   'icon' => 'database',         'sort' => 4,
            'modules' => [
                'import_center' => ['view', 'create', 'delete', 'import'],
                'report_center' => ['view', 'export', 'print'],
            ],
        ],
        ['slug' => 'administration',   'name' => 'Administration',    'icon' => 'settings',         'sort' => 5,
            'modules' => [
                'scheduler'     => ['view', 'create', 'edit', 'delete'],
                'notifications' => ['view'],
                'audit_logs'    => ['view', 'export'],
                'settings'      => ['view', 'edit'],
            ],
        ],
        ['slug' => 'user_management',  'name' => 'User Management',   'icon' => 'users',            'sort' => 6,
            'modules' => [
                'users' => ['view', 'create', 'edit', 'delete', 'approve'],
                'roles' => ['view', 'create', 'edit', 'delete', 'approve'],
            ],
        ],
    ];

    // ─── 20 Default Roles ─────────────────────────────────────────────────────

    private const ROLES = [
        ['slug' => 'system_administrator', 'name' => 'System Administrator', 'type' => 'system', 'is_system' => true,  'color' => '#dc2626',
            'desc' => 'Full unrestricted access to all system functions and settings.',
            'perms' => ['*'],
        ],
        ['slug' => 'hospital_administrator', 'name' => 'Hospital Administrator', 'type' => 'system', 'is_system' => true,  'color' => '#7c3aed',
            'desc' => 'Administrative control over all hospital operations except system configuration.',
            'perms' => ['dashboard.*', 'mis_report.*', 'brm_report.*', 'financial.*', 'operational.*',
                        'doctors.*', 'departments.*', 'surgery.*', 'pharmacy.*',
                        'import_center.*', 'report_center.*', 'scheduler.*', 'notifications.view',
                        'audit_logs.*', 'settings.view', 'users.*', 'roles.view'],
        ],
        ['slug' => 'branch_administrator', 'name' => 'Branch Administrator', 'type' => 'system', 'is_system' => true,  'color' => '#2563eb',
            'desc' => 'Full operational control scoped to an assigned hospital branch.',
            'perms' => ['dashboard.*', 'mis_report.view', 'mis_report.export', 'mis_report.print', 'mis_report.import',
                        'brm_report.view', 'brm_report.export', 'financial.view', 'financial.export',
                        'operational.*', 'doctors.view', 'departments.view', 'surgery.view', 'pharmacy.view',
                        'import_center.*', 'report_center.view', 'report_center.export',
                        'scheduler.view', 'notifications.view', 'audit_logs.view', 'users.view', 'users.edit'],
        ],
        ['slug' => 'finance_manager', 'name' => 'Finance Manager', 'type' => 'system', 'is_system' => true,  'color' => '#059669',
            'desc' => 'Complete access to financial data, MIS reports, and billing analytics.',
            'perms' => ['dashboard.view', 'dashboard.export', 'dashboard.drill_down',
                        'mis_report.view', 'mis_report.export', 'mis_report.print', 'mis_report.email',
                        'mis_report.import', 'mis_report.schedule',
                        'brm_report.*', 'financial.*',
                        'import_center.view', 'import_center.create', 'import_center.import',
                        'report_center.view', 'report_center.export', 'report_center.print',
                        'scheduler.view', 'scheduler.create', 'scheduler.edit',
                        'audit_logs.view', 'audit_logs.export'],
        ],
        ['slug' => 'operations_manager', 'name' => 'Operations Manager', 'type' => 'system', 'is_system' => true,  'color' => '#0891b2',
            'desc' => 'Access to operational dashboards, admissions, bed management, and scheduling.',
            'perms' => ['dashboard.*', 'mis_report.view', 'mis_report.export', 'mis_report.print',
                        'operational.*', 'doctors.view', 'departments.view', 'surgery.view',
                        'import_center.view', 'import_center.create', 'import_center.import',
                        'report_center.view', 'scheduler.view', 'notifications.view', 'audit_logs.view'],
        ],
        ['slug' => 'medical_superintendent', 'name' => 'Medical Superintendent', 'type' => 'system', 'is_system' => true,  'color' => '#d97706',
            'desc' => 'Clinical oversight access covering doctors, departments, and surgical analytics.',
            'perms' => ['dashboard.*', 'operational.*', 'doctors.*', 'departments.*', 'surgery.*',
                        'mis_report.view', 'mis_report.export',
                        'report_center.view', 'audit_logs.view'],
        ],
        ['slug' => 'doctor', 'name' => 'Doctor', 'type' => 'system', 'is_system' => true,  'color' => '#16a34a',
            'desc' => 'Limited read-only view for clinical staff to check their performance dashboards.',
            'perms' => ['dashboard.view', 'doctors.view', 'operational.view'],
        ],
        ['slug' => 'department_head', 'name' => 'Department Head', 'type' => 'system', 'is_system' => true,  'color' => '#0d9488',
            'desc' => 'Read access to department-level reports and doctor performance data.',
            'perms' => ['dashboard.view', 'departments.view', 'departments.export',
                        'doctors.view', 'operational.view', 'surgery.view', 'report_center.view'],
        ],
        ['slug' => 'nursing_manager', 'name' => 'Nursing Manager', 'type' => 'system', 'is_system' => true,  'color' => '#7c3aed',
            'desc' => 'Access to bed occupancy, ward operations, and patient census reports.',
            'perms' => ['dashboard.view', 'operational.view', 'operational.export', 'departments.view', 'report_center.view'],
        ],
        ['slug' => 'reception', 'name' => 'Reception', 'type' => 'system', 'is_system' => true,  'color' => '#64748b',
            'desc' => 'Minimal read access to the dashboard for front-desk staff.',
            'perms' => ['dashboard.view'],
        ],
        ['slug' => 'billing_executive', 'name' => 'Billing Executive', 'type' => 'system', 'is_system' => true,  'color' => '#ea580c',
            'desc' => 'Access to billing, financial reports, and basic MIS summaries.',
            'perms' => ['dashboard.view', 'financial.view', 'financial.export', 'financial.print',
                        'mis_report.view', 'brm_report.view', 'report_center.view'],
        ],
        ['slug' => 'cashier', 'name' => 'Cashier', 'type' => 'system', 'is_system' => true,  'color' => '#78716c',
            'desc' => 'Basic dashboard and read-only financial view for cashier stations.',
            'perms' => ['dashboard.view', 'financial.view'],
        ],
        ['slug' => 'pharmacy_manager', 'name' => 'Pharmacy Manager', 'type' => 'system', 'is_system' => true,  'color' => '#0f766e',
            'desc' => 'Full access to pharmacy analytics and basic reporting.',
            'perms' => ['dashboard.view', 'pharmacy.*', 'report_center.view'],
        ],
        ['slug' => 'lab_manager', 'name' => 'Lab Manager', 'type' => 'system', 'is_system' => true,  'color' => '#1d4ed8',
            'desc' => 'Read access to department reports and basic dashboard for lab operations.',
            'perms' => ['dashboard.view', 'departments.view', 'report_center.view'],
        ],
        ['slug' => 'radiology_manager', 'name' => 'Radiology Manager', 'type' => 'system', 'is_system' => true,  'color' => '#7e22ce',
            'desc' => 'Read access to department reports for radiology management.',
            'perms' => ['dashboard.view', 'departments.view', 'report_center.view'],
        ],
        ['slug' => 'hr', 'name' => 'Human Resources', 'type' => 'system', 'is_system' => true,  'color' => '#be185d',
            'desc' => 'User management and basic audit trail access for HR operations.',
            'perms' => ['dashboard.view', 'users.*', 'audit_logs.view'],
        ],
        ['slug' => 'it_administrator', 'name' => 'IT Administrator', 'type' => 'system', 'is_system' => true,  'color' => '#374151',
            'desc' => 'System administration: import, scheduler, settings, user management, roles.',
            'perms' => ['dashboard.*', 'import_center.*', 'scheduler.*', 'notifications.*',
                        'audit_logs.*', 'settings.*', 'users.*', 'roles.*', 'mis_report.view', 'report_center.view'],
        ],
        ['slug' => 'auditor', 'name' => 'Auditor', 'type' => 'system', 'is_system' => true,  'color' => '#92400e',
            'desc' => 'Read-only and export access across all modules for compliance audit purposes.',
            'perms' => ['dashboard.view', 'dashboard.export',
                        'mis_report.view', 'mis_report.export',
                        'brm_report.view', 'brm_report.export',
                        'financial.view', 'financial.export',
                        'operational.view', 'operational.export',
                        'doctors.view', 'departments.view', 'surgery.view', 'pharmacy.view',
                        'report_center.view', 'audit_logs.view', 'audit_logs.export'],
        ],
        ['slug' => 'read_only_user', 'name' => 'Read Only User', 'type' => 'system', 'is_system' => true,  'color' => '#94a3b8',
            'desc' => 'View-only access to core reports and dashboard with no export or edit rights.',
            'perms' => ['dashboard.view', 'mis_report.view', 'brm_report.view',
                        'financial.view', 'operational.view', 'report_center.view'],
        ],
        ['slug' => 'custom_role', 'name' => 'Custom Role', 'type' => 'custom', 'is_system' => false, 'color' => '#6366f1',
            'desc' => 'Template for creating organisation-specific custom roles. No permissions assigned by default.',
            'perms' => [],
        ],
    ];

    // ─── Run ─────────────────────────────────────────────────────────────────

    public function run(): void
    {
        // 1. Seed permission groups + permissions
        $permMap = []; // slug => Permission model

        foreach (self::GROUPS as $i => $groupDef) {
            $group = PermissionGroup::firstOrCreate(
                ['slug' => $groupDef['slug']],
                ['name' => $groupDef['name'], 'icon' => $groupDef['icon'], 'sort_order' => $groupDef['sort']],
            );

            $permSort = 0;
            foreach ($groupDef['modules'] as $module => $actions) {
                foreach ($actions as $action) {
                    $slug = "{$module}.{$action}";
                    $perm = Permission::firstOrCreate(
                        ['slug' => $slug],
                        [
                            'group_id'   => $group->id,
                            'module'     => $module,
                            'action'     => $action,
                            'name'       => $this->toLabel($module) . ' — ' . $this->toLabel($action),
                            'sort_order' => $permSort++,
                        ],
                    );
                    $permMap[$slug] = $perm;
                }
            }
        }

        $allSlugs = array_keys($permMap);

        // 2. Seed roles + attach permissions
        foreach (self::ROLES as $roleDef) {
            $role = Role::withTrashed()->firstOrCreate(
                ['slug' => $roleDef['slug']],
                [
                    'name'        => $roleDef['name'],
                    'description' => $roleDef['desc'],
                    'type'        => $roleDef['type'],
                    'is_system'   => $roleDef['is_system'],
                    'is_active'   => true,
                    'color'       => $roleDef['color'],
                    'deleted_at'  => null,
                ],
            );

            if ($role->trashed()) {
                $role->restore();
            }

            $resolved = $this->resolvePermissions($roleDef['perms'], $allSlugs);
            $ids = collect($resolved)
                ->filter(fn ($s) => isset($permMap[$s]))
                ->map(fn ($s) => $permMap[$s]->id)
                ->toArray();

            $role->permissions()->sync($ids);
        }
    }

    private function resolvePermissions(array $patterns, array $allSlugs): array
    {
        if (in_array('*', $patterns, true)) {
            return $allSlugs;
        }

        $result = [];
        foreach ($patterns as $pattern) {
            if (str_ends_with($pattern, '.*')) {
                $module = substr($pattern, 0, -2);
                foreach ($allSlugs as $slug) {
                    if (str_starts_with($slug, $module . '.')) {
                        $result[] = $slug;
                    }
                }
            } else {
                $result[] = $pattern;
            }
        }

        return array_unique($result);
    }

    private function toLabel(string $str): string
    {
        return ucwords(str_replace('_', ' ', $str));
    }
}
