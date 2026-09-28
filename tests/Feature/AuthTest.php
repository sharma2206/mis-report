<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email'    => 'test@mis.local',
            'password' => 'secret123',
            'is_active'=> true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'test@mis.local',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['success', 'token', 'user' => ['id', 'name', 'email', 'role']]);
        $this->assertTrue($response->json('success'));
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'test@mis.local', 'password' => 'correct']);

        $this->postJson('/api/auth/login', ['email' => 'test@mis.local', 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        User::factory()->create(['email' => 'inactive@mis.local', 'password' => 'pass123', 'is_active' => false]);

        $this->postJson('/api/auth/login', ['email' => 'inactive@mis.local', 'password' => 'pass123'])
            ->assertUnprocessable();
    }

    public function test_logout_invalidates_token(): void
    {
        $user  = User::factory()->create(['password' => 'pass123', 'is_active' => true]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        // Token should be removed from DB
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }
}
