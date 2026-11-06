<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * AuthTest — covers the SPA session-based auth flow.
 *
 * The API uses Sanctum SPA cookie auth (no token returned on login).
 * Tests authenticate via actingAs() for all protected endpoints.
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_user_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email'     => 'test@mis.local',
            'password'  => 'secret123',
            'is_active' => true,
        ]);

        // Send Referer header so Sanctum's EnsureFrontendRequestsAreStateful
        // middleware treats this as a stateful (SPA) request and provides a session.
        $response = $this->withHeaders(['Referer' => config('app.url')])
            ->postJson('/api/v1/auth/login', [
                'email'    => 'test@mis.local',
                'password' => 'secret123',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['success', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'test@mis.local', 'password' => 'correct']);

        $this->postJson('/api/v1/auth/login', ['email' => 'test@mis.local', 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        User::factory()->create([
            'email'     => 'inactive@mis.local',
            'password'  => 'pass123',
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', ['email' => 'inactive@mis.local', 'password' => 'pass123'])
            ->assertUnprocessable();
    }

    public function test_login_locks_account_after_max_failed_attempts(): void
    {
        $user = User::factory()->create([
            'email'                  => 'brute@mis.local',
            'password'               => 'correct_pass',
            'is_active'              => true,
            'failed_login_attempts'  => 0,
        ]);

        // Exhaust the 5-attempt threshold
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong']);
        }

        $user->refresh();
        $this->assertNotNull($user->locked_at, 'Account should be locked after max failed attempts');
        $this->assertEquals(5, $user->failed_login_attempts);
    }

    public function test_locked_account_cannot_login(): void
    {
        User::factory()->create([
            'email'     => 'locked@mis.local',
            'password'  => 'secret123',
            'is_active' => true,
            'locked_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', ['email' => 'locked@mis.local', 'password' => 'secret123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_logout_succeeds_for_authenticated_user(): void
    {
        $user  = User::factory()->create(['is_active' => true]);
        // Use token-based auth for test isolation (no session store needed).
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);

        // Access token should be revoked.
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->actingAs($user)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_admin_user_has_dashboard_access(): void
    {
        $user = User::factory()->create([
            'email'     => 'admin@mis.local',
            'password'  => 'secret123',
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->actingAs($user)->getJson('/api/v1/kpis')
            ->assertOk();
    }

    public function test_user_without_permission_is_forbidden(): void
    {
        $user = User::factory()->create([
            'email'     => 'noperm@mis.local',
            'password'  => 'secret123',
            'role'      => 'custom',
            'is_active' => true,
        ]);

        $this->actingAs($user)->getJson('/api/v1/kpis')
            ->assertForbidden();
    }

    public function test_403_response_does_not_invalidate_authenticated_session(): void
    {
        // A viewer lacks users.view permission → receives 403.
        $user = User::factory()->create(['role' => 'viewer', 'is_active' => true]);

        $this->actingAs($user)->getJson('/api/v1/users')->assertForbidden();

        // The session is still valid — /auth/me should return 200.
        $this->actingAs($user)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_legacy_admin_without_rbac_role_gets_wildcard_permission(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $this->assertContains('*', $user->getAllPermissions());
    }

    public function test_legacy_manager_without_rbac_role_gets_manager_permissions(): void
    {
        $user = User::factory()->create(['role' => 'manager', 'is_active' => true]);
        $perms = $user->getAllPermissions();
        $this->assertContains('dashboard.view', $perms);
        $this->assertContains('financial.view', $perms);
        $this->assertNotContains('*', $perms);
    }

    public function test_failed_login_resets_on_successful_login(): void
    {
        $user = User::factory()->create([
            'email'                 => 'reset@mis.local',
            'password'              => 'correct_pass',
            'is_active'             => true,
            'failed_login_attempts' => 3,
        ]);

        $this->withHeaders(['Referer' => config('app.url')])
            ->postJson('/api/v1/auth/login', [
                'email'    => 'reset@mis.local',
                'password' => 'correct_pass',
            ])
            ->assertOk();

        $this->assertSame(0, $user->fresh()->failed_login_attempts);
    }

    public function test_security_headers_allow_vite_dev_server_and_valid_permissions_policy(): void
    {
        $response = $this->get('/login');

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp);
        $this->assertStringContainsString('http://localhost:5173', $csp);
        $this->assertStringContainsString('http://localhost:5174', $csp);

        $permissionsPolicy = $response->headers->get('Permissions-Policy');
        $this->assertNotNull($permissionsPolicy);
        $this->assertStringNotContainsString('interest-cohort', $permissionsPolicy);
    }
}
