<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Hospital;
use App\Models\HospitalBranch;
use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserBranch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RbacSecurityTest
 *
 * Covers all the security scenarios from the implementation requirements.
 */
class RbacSecurityTest extends TestCase
{
    use RefreshDatabase;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function makePermission(string $slug, string $module = null, string $action = null): Permission
    {
        $group = PermissionGroup::firstOrCreate(
            ['slug' => 'test_group'],
            ['name' => 'Test Group', 'icon' => 'shield', 'sort_order' => 1]
        );

        [$mod, $act] = str_contains($slug, '.')
            ? explode('.', $slug, 2)
            : [$module ?? 'test', $action ?? $slug];

        return Permission::firstOrCreate(
            ['slug' => $slug],
            [
                'group_id' => $group->id,
                'module'   => $mod,
                'action'   => $act,
                'name'     => ucwords(str_replace(['.', '_'], ' ', $slug)),
            ]
        );
    }

    private function makeRole(string $name, array $permissionSlugs = [], bool $active = true): Role
    {
        $role = Role::create([
            'name'      => $name,
            'slug'      => \Illuminate\Support\Str::slug($name, '_'),
            'type'      => 'custom',
            'is_active' => $active,
        ]);

        foreach ($permissionSlugs as $slug) {
            $perm = $this->makePermission($slug);
            $role->permissions()->attach($perm->id);
        }

        return $role;
    }

    private function makeUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['is_active' => true], $overrides));
    }

    // ─── 1. Unauthenticated access ────────────────────────────────────────────

    public function test_unauthenticated_access_to_protected_api_returns_401(): void
    {
        $this->getJson('/api/v1/kpis')->assertUnauthorized();
        $this->getJson('/api/v1/users')->assertUnauthorized();
        $this->getJson('/api/v1/rbac/roles')->assertUnauthorized();
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_logout_requires_authentication(): void
    {
        // Without auth, logout should return 401 (not 200).
        $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
    }

    // ─── 2. Active user ──────────────────────────────────────────────────────

    public function test_authenticated_active_user_with_permission_is_allowed(): void
    {
        $user = $this->makeUser(['role' => 'viewer']);

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertOk();
    }

    // ─── 3. Inactive user ────────────────────────────────────────────────────

    public function test_inactive_user_is_rejected_with_403(): void
    {
        $user = $this->makeUser(['is_active' => false]);

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_DISABLED');
    }

    // ─── 4. Locked user ──────────────────────────────────────────────────────

    public function test_locked_user_is_rejected_with_403(): void
    {
        $user = $this->makeUser(['locked_at' => now()]);

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_DISABLED');
    }

    // ─── 5. Valid permission ──────────────────────────────────────────────────

    public function test_user_with_valid_rbac_permission_is_allowed(): void
    {
        $user = $this->makeUser(['role' => 'custom_role']);
        $role = $this->makeRole('Dashboard Viewer', ['dashboard.view']);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertOk();
    }

    // ─── 6. Without permission ───────────────────────────────────────────────

    public function test_user_without_permission_gets_403(): void
    {
        $user = $this->makeUser(['role' => 'custom_role']);
        // Assign a role with no permissions.
        $role = $this->makeRole('Empty Role', []);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden()
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    // ─── 7. Expired role ─────────────────────────────────────────────────────

    public function test_expired_role_grants_no_permissions(): void
    {
        $user = $this->makeUser(['role' => 'custom_role']);
        $role = $this->makeRole('Expired Role', ['dashboard.view']);
        // Assign with a past expiry date.
        $user->roles()->attach($role->id, ['expires_at' => now()->subDay()]);
        $user->clearPermissionCache();

        // User has no other roles or legacy role string → should get 403.
        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden();
    }

    // ─── 8. Inactive role ────────────────────────────────────────────────────

    public function test_inactive_role_grants_no_permissions(): void
    {
        $user = $this->makeUser(['role' => 'custom_role']);
        $role = $this->makeRole('Inactive Role', ['dashboard.view'], active: false);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden();
    }

    // ─── 9. No legacy fallback when RBAC role exists ────────────────────────

    public function test_role_with_no_permissions_does_not_fall_back_to_legacy(): void
    {
        // User has 'manager' legacy role (which would grant dashboard access via legacy),
        // but also has an active RBAC role with ZERO permissions.
        $user = $this->makeUser(['role' => 'manager']);
        $role = $this->makeRole('Empty RBAC Role', []);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        // RBAC takes control — empty permission set, no legacy fallback.
        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertForbidden()
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    // ─── 10. Cross-tenant user access ────────────────────────────────────────

    public function test_cross_tenant_user_is_hidden(): void
    {
        $admin = $this->makeUser(['role' => 'admin']);

        $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other', 'is_active' => true]);
        $this->makeUser([
            'tenant_id' => $otherTenant->id,
            'email'     => 'other@tenant.test',
        ]);

        $emails = collect(
            $this->actingAs($admin)->getJson('/api/v1/users')->assertOk()->json('data')
        )->pluck('email');

        $this->assertFalse($emails->contains('other@tenant.test'));
    }

    // ─── 11. Null branch without global permission ────────────────────────────

    public function test_null_branch_user_without_global_permission_cannot_access_branch_endpoints(): void
    {
        // User: no primary branch, no branch assignments, no global permission.
        $user = $this->makeUser(['branch' => null, 'role' => 'viewer']);

        $this->actingAs($user)
            ->getJson('/api/v1/operational/kpis?branch=chromepet')
            ->assertForbidden();
    }

    // ─── 12. User assigned multiple branches ─────────────────────────────────

    public function test_user_with_multiple_branch_assignments_can_access_assigned_branches(): void
    {
        $user = $this->makeUser(['branch' => null, 'role' => 'viewer']);
        UserBranch::create(['user_id' => $user->id, 'branch' => 'chromepet']);
        UserBranch::create(['user_id' => $user->id, 'branch' => 'oragadam']);

        // Chromepet is in the user's list → passes branch check.
        // The KPI endpoint also requires dashboard.view, but branch check is what we're testing.
        $this->assertTrue($user->canAccessBranch('chromepet'));
        $this->assertTrue($user->canAccessBranch('oragadam'));
    }

    public function test_user_cannot_access_unassigned_branch(): void
    {
        $user = $this->makeUser(['branch' => 'chromepet', 'role' => 'viewer']);
        // 'oragadam' is NOT in the user's assignments.

        $this->assertFalse($user->canAccessBranch('oragadam'));
    }

    // ─── 13. Permission updated by admin — cache invalidated ─────────────────

    public function test_permission_cache_is_invalidated_after_role_permission_update(): void
    {
        $user = $this->makeUser(['role' => 'custom_role']);
        $role = $this->makeRole('Dynamic Role', []);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        // Before permission assignment → 403.
        $this->actingAs($user)->getJson('/api/v1/kpis')->assertForbidden();

        // Add the permission.
        $perm = $this->makePermission('dashboard.view');
        $role->permissions()->attach($perm->id);
        $user->clearPermissionCache();

        // After cache cleared → 200.
        $this->actingAs($user)->getJson('/api/v1/kpis')->assertOk();
    }

    // ─── 14. HTTP 403 does not log out the user ───────────────────────────────

    public function test_403_response_does_not_clear_authenticated_session(): void
    {
        // A viewer cannot access users endpoint → 403.
        $user = $this->makeUser(['role' => 'viewer']);

        $response = $this->actingAs($user)->getJson('/api/v1/users');
        $response->assertForbidden();

        // The /auth/me endpoint should still return the user (session intact).
        $this->actingAs($user)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    // ─── 15. Admin bypass removed — no isAdmin() shortcut ───────────────────

    public function test_legacy_admin_role_string_does_not_bypass_rbac_when_rbac_role_assigned(): void
    {
        // User has legacy 'admin' role string AND an active RBAC role with no permissions.
        $user = $this->makeUser(['role' => 'admin']);
        $role = $this->makeRole('Limited Admin Role', []);
        $user->roles()->attach($role->id);
        $user->clearPermissionCache();

        // RBAC takes over → empty permissions → 403.
        $this->actingAs($user)
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_legacy_admin_without_rbac_role_uses_legacy_permissions(): void
    {
        // Pure legacy path: 'admin' role string, no RBAC role assigned.
        $user = $this->makeUser(['role' => 'admin']);

        // Admin legacy string → wildcard → all permissions → 200.
        $perms = $user->getAllPermissions();
        $this->assertContains('*', $perms);
    }
}

