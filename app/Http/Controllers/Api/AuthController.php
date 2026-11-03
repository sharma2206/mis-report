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
    private const MAX_FAILED_ATTEMPTS = 5;

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user && $user->locked_at !== null) {
            AuditLog::record('login_blocked_locked', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is locked. Please contact an administrator.']]);
        }

        if ($user && ! $user->is_active) {
            AuditLog::record('login_blocked_inactive', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is disabled.']]);
        }

        if (! Auth::attempt($request->only('email', 'password'))) {
            if ($user) {
                $attempts = ($user->failed_login_attempts ?? 0) + 1;
                $updates = ['failed_login_attempts' => $attempts];

                if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
                    $updates['locked_at'] = now();
                    AuditLog::record('login_account_locked', ['email' => $request->email, 'attempts' => $attempts], null, null, $request);
                }

                $user->update($updates);
            }

            AuditLog::record('login_failed', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $user = Auth::user();

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user->update(['last_login_at' => now(), 'failed_login_attempts' => 0]);
        AuditLog::record('login', ['role' => $user->role], $user->branch, null, $request);
        LoginLog::record($user->id, 'login', [], $request->ip(), $request->userAgent());

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->update(['last_logout_at' => now()]);
            AuditLog::record('logout', [], null, null, $request);
            LoginLog::record($user->id, 'logout', [], $request->ip(), $request->userAgent());

            if ($user->currentAccessToken() instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $user->currentAccessToken()->delete();
            }
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['success' => true, 'message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        return response()->json(['success' => true, 'data' => $this->userPayload($user)]);
    }

    private function userPayload(User $user): array
    {
        $roles = $user->roles()->select('roles.id', 'roles.name', 'roles.slug', 'roles.color', 'roles.is_active')->get();
        $permissions = $user->getAllPermissions();
        $branches = $user->userBranches()->pluck('branch')->all();
        $departments = $user->userDepartments()->pluck('department')->all();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'employee_code' => $user->employee_code,
            'phone' => $user->mobile ?? $user->phone ?? null,
            'is_active' => (bool) $user->is_active,
            'locked_at' => $user->locked_at ? $user->locked_at->toISOString() : null,
            'role' => $user->role,
            'roles' => $roles,
            'permissions' => array_values(array_unique($permissions)),
            'assigned_branches' => $branches,
            'assigned_departments' => $departments,
            'default_branch' => $user->branch,
            'default_department' => $user->department,
            'profile' => [
                'employee_code' => $user->employee_code,
                'phone' => $user->mobile ?? $user->phone ?? null,
                'designation' => $user->designation,
                'department' => $user->department,
            ],
        ];
    }

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
