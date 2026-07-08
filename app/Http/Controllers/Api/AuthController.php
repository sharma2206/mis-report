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
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            AuditLog::record('login_failed', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            throw ValidationException::withMessages(['email' => ['Account is disabled.']]);
        }

        $request->session()->regenerate();

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
        $uid = $request->user()->id;
        $request->user()->update(['last_logout_at' => now()]);
        AuditLog::record('logout', [], null, null, $request);
        LoginLog::record($uid, 'logout', [], $request->ip(), $request->userAgent());
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

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
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password,
            'role'     => $request->role ?? 'viewer',
            'branch'   => $request->branch,
        ]);

        AuditLog::record('user_created', ['target_id' => $user->id, 'role' => $user->role], null, null, $request);

        return response()->json(['success' => true, 'data' => $user], 201);
    }
}
