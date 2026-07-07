<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Returns a Sanctum API token on valid credentials.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            AuditLog::record('login_failed', ['email' => $request->email], null, null, $request);
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => ['Account is disabled.']]);
        }

        // Revoke all previous tokens for this device (optional: keep only 5 recent)
        $user->tokens()->where('name', 'api')->delete();

        $token = $user->createToken('api', ['*'], now()->addDays(30))->plainTextToken;

        AuditLog::record('login', ['role' => $user->role], $user->branch, null, $request);

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => [
                'id'     => $user->id,
                'name'   => $user->name,
                'email'  => $user->email,
                'role'   => $user->role,
                'branch' => $user->branch,
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        AuditLog::record('logout', [], null, null, $request);
        $request->user()->currentAccessToken()->delete();

        return response()->json(['success' => true, 'message' => 'Logged out.']);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $request->user()]);
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
