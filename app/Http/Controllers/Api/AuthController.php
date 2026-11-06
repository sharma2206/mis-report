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

    /**
     * Login — public endpoint.
     *
     * Validates credentials, enforces account-status checks before the
     * Auth::attempt call (to avoid timing-based enumeration via auth backends),
     * regenerates the session, resets failed-attempt counter, and records audit logs.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        // Account status checks BEFORE Auth::attempt to give informative errors.
        if ($user && $user->locked_at !== null) {
            AuditLog::record('login_blocked_locked', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is locked. Please contact an administrator.']]);
        }

        if ($user && !$user->is_active) {
            AuditLog::record('login_blocked_inactive', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Account is disabled.']]);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            if ($user) {
                $attempts = ($user->failed_login_attempts ?? 0) + 1;
                $updates  = ['failed_login_attempts' => $attempts];

                if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
                    $updates['locked_at'] = now();
                    AuditLog::record('login_account_locked', ['email' => $request->email, 'attempts' => $attempts], null, null, $request);
                    LoginLog::record($user->id, 'locked', [], $request->ip(), $request->userAgent());
                }

                $user->update($updates);
            }

            AuditLog::record('login_failed', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        /** @var User $user */
        $user = Auth::user();

        // Session regeneration prevents session fixation attacks.
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Reset failed attempts and record last login.
        $user->update([
            'last_login_at'         => now(),
            'failed_login_attempts' => 0,
        ]);

        AuditLog::record('login', ['role' => $user->role], $user->branch, null, $request);
        LoginLog::record($user->id, 'login', [], $request->ip(), $request->userAgent());

        return response()->json([
            'success' => true,
            'user'    => $this->userPayload($user),
        ]);
    }

    /**
     * Logout — requires auth:sanctum (enforced via route middleware).
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->update(['last_logout_at' => now()]);
            AuditLog::record('logout', [], null, null, $request);
            LoginLog::record($user->id, 'logout', [], $request->ip(), $request->userAgent());

            // Revoke the Sanctum token if using token-based auth.
            if ($user->currentAccessToken() instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $user->currentAccessToken()->delete();
            }
        }

        // Invalidate the session for SPA / stateful auth.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['success' => true, 'message' => 'Logged out.']);
    }

    /**
     * Return the currently authenticated user — requires auth:sanctum (enforced via route middleware).
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->userPayload($request->user())]);
    }

    /**
     * Register a new user — requires auth:sanctum and 'users.create' permission.
     * Public self-registration is disabled; only authorised administrators may
     * create accounts through the user management API (/api/v1/users).
     *
     * This endpoint is intentionally limited to prevent duplicate registration paths.
     */
    public function register(Request $request): JsonResponse
    {
        // Explicit permission check — does not rely on the deprecated isAdmin() helper.
        if (!$request->user()?->hasPermission('users.create')) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'sometimes|in:viewer,staff,manager',
        ]);

        // Tenant id comes exclusively from the authenticated user — never from input.
        $tenantId = $request->user()->tenant_id;

        if (!$tenantId) {
            return response()->json(['success' => false, 'message' => 'Actor has no tenant assignment.'], 422);
        }

        $user = User::create([
            'tenant_id' => $tenantId,
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => $request->password,
            'role'      => $request->role ?? 'viewer',
        ]);

        AuditLog::record('user_created', ['target_id' => $user->id, 'role' => $user->role], null, null, $request);

        return response()->json(['success' => true, 'data' => $user], 201);
    }

    /**
     * Build the user payload returned by login and /auth/me.
     */
    private function userPayload(User $user): array
    {
        $roles       = $user->roles()->select('roles.id', 'roles.name', 'roles.slug', 'roles.color', 'roles.is_active')->get();
        $permissions = $user->getAllPermissions();
        $branches    = $user->userBranches()->pluck('branch')->all();
        $departments = $user->userDepartments()->pluck('department')->all();

        return [
            'id'                  => $user->id,
            'name'                => $user->name,
            'email'               => $user->email,
            'employee_code'       => $user->employee_code,
            'phone'               => $user->mobile ?? $user->phone ?? null,
            'is_active'           => (bool) $user->is_active,
            'locked_at'           => $user->locked_at ? $user->locked_at->toISOString() : null,
            'role'                => $user->role,
            'roles'               => $roles,
            'permissions'         => array_values(array_unique($permissions)),
            'assigned_branches'   => $branches,
            'assigned_departments' => $departments,
            'default_branch'      => $user->branch,
            'default_department'  => $user->department,
            'profile'             => [
                'employee_code' => $user->employee_code,
                'phone'         => $user->mobile ?? $user->phone ?? null,
                'designation'   => $user->designation,
                'department'    => $user->department,
            ],
        ];
    }
}
