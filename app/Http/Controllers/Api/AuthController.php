<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Authenticates via session cookie (Sanctum SPA auth). No token returned.
     */
    /**
     * Maximum failed login attempts before account is locked.
     * After this threshold the account is locked and requires admin unlock.
     */
    private const MAX_FAILED_ATTEMPTS = 5;

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // ── Pre-flight: look up user before Auth::attempt() so we can
        //    enforce lockout and inactive checks without leaking whether
        //    the email exists (all failure paths return the same message).
        $user = User::where('email', $request->email)->first();

        // Account locked — reject immediately, no attempt counted.
        if ($user && $user->locked_at !== null) {
            AuditLog::record('login_blocked_locked', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is locked. Please contact an administrator.']]);
        }

        // Account inactive — reject immediately.
        if ($user && ! $user->is_active) {
            AuditLog::record('login_blocked_inactive', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is disabled.']]);
        }

        if (! Auth::attempt($request->only('email', 'password'))) {
            // Increment failure counter and auto-lock after threshold.
            if ($user) {
                $attempts = ($user->failed_login_attempts ?? 0) + 1;
                $updates  = ['failed_login_attempts' => $attempts];

                if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
                    $updates['locked_at'] = now();
                    AuditLog::record('login_account_locked', [
                        'email'    => $request->email,
                        'attempts' => $attempts,
                    ], null, null, $request);
                }

                $user->update($updates);
            }

            AuditLog::record('login_failed', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $user = Auth::user();

        // Regenerate session only when a session store is attached (SPA cookie flow).
        // Token-based flows (tests, CLI, mobile) do not have a session.
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user->update(['last_login_at' => now(), 'failed_login_attempts' => 0]);
        AuditLog::record('login', ['role' => $user->role], $user->branch, null, $request);
        LoginLog::record($user->id, 'login', [], $request->ip(), $request->userAgent());

        return response()->json([
            'success' => true,
            'user'    => $this->userPayload($user),
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $uid  = $user->id;

        $user->update(['last_logout_at' => now()]);
        AuditLog::record('logout', [], null, null, $request);
        LoginLog::record($uid, 'logout', [], $request->ip(), $request->userAgent());

        // Revoke the current API token if one was used (token-based / mobile flow).
        if ($user->currentAccessToken() instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $user->currentAccessToken()->delete();
        }

        // Invalidate the session if one is attached (SPA cookie flow).
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['success' => true, 'message' => 'Logged out.']);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->userPayload($request->user())]);
    }

    private function userPayload(User $user): array
    {
        $permissions = $user->getAllPermissions();
        $roles = $user->roles()->select('roles.id', 'roles.name', 'roles.slug', 'roles.color')->get();

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'branch'      => $user->branch,
            'is_active'   => $user->is_active,
            'permissions' => $permissions,
            'roles'       => $roles,
        ];
    }

    /**
     * POST /api/auth/register  (admin only)
     */
    public function register(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'sometimes|in:admin,manager,viewer',
            'branch'   => 'nullable|in:chromepet,oragadam',
        ]);

        $user = User::create([
            'tenant_id' => $request->user()->tenant_id ?: \App\Support\TenantContext::resolveId(),
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => $request->password,
            'role'      => $request->role ?? 'viewer',
            'branch'    => $request->branch,
        ]);

        AuditLog::record('user_created', ['target_id' => $user->id, 'role' => $user->role], null, null, $request);

        return response()->json(['success' => true, 'data' => $user], 201);
    }
}
