<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_viewer_cannot_open_operational_or_branch_comparison(): void
    {
        $viewer = User::factory()->create(['role' => 'viewer', 'branch' => null]);

        $this->actingAs($viewer)
            ->getJson('/api/v1/operational/kpis?branch=chromepet')
            ->assertForbidden();

        $this->actingAs($viewer)
            ->getJson('/api/v1/analytics/charts/branch-comparison?branch=chromepet')
            ->assertForbidden();
    }

    public function test_staff_passes_operational_permission(): void
    {
        $staff = User::factory()->create(['role' => 'staff', 'branch' => 'chromepet']);

        // Missing branch is a validation error, which means the permission check passed.
        $this->actingAs($staff)
            ->getJson('/api/v1/operational/kpis')
            ->assertStatus(422);
    }

    public function test_manager_cannot_manage_users(): void
    {
        $manager = User::factory()->manager('chromepet')->create();

        $this->actingAs($manager)
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_assigned_rbac_role_replaces_legacy_manager_access(): void
    {
        $manager = User::factory()->manager()->create();

        $group = PermissionGroup::create([
            'name' => 'Core',
            'slug' => 'core_access',
            'sort_order' => 1,
        ]);

        $permission = Permission::create([
            'group_id' => $group->id,
            'module' => 'dashboard',
            'action' => 'view',
            'slug' => 'dashboard.view',
            'name' => 'View Dashboard',
        ]);

        $role = Role::create([
            'name' => 'Reception',
            'slug' => 'reception',
            'type' => 'system',
            'is_active' => true,
        ]);

        $role->permissions()->attach($permission->id);
        $manager->roles()->attach($role->id);
        $manager->clearPermissionCache();

        $this->actingAs($manager)
            ->getJson('/api/v1/analytics/charts/branch-comparison?branch=chromepet')
            ->assertForbidden();
    }

    public function test_audit_log_is_scoped_to_the_user_branch(): void
    {
        $admin = User::factory()->admin()->create(['branch' => 'chromepet']);

        AuditLog::create([
            'user_id' => $admin->id,
            'event' => 'export_excel',
            'branch' => 'chromepet',
        ]);
        AuditLog::create([
            'user_id' => $admin->id,
            'event' => 'export_excel',
            'branch' => 'oragadam',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/audit-logs');

        $response->assertOk();
        $branches = collect($response->json('data'))->pluck('branch')->all();
        $this->assertContains('chromepet', $branches);
        $this->assertNotContains('oragadam', $branches);
    }
}
