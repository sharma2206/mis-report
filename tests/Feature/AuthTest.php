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
}
