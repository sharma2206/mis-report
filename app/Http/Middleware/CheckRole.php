<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces role-based access control.
 *
 * Usage: ->middleware('role:staff|manager|admin')
 * Accepts pipe-separated list of allowed roles.
 *
 * Role matching is RBAC-only (active, non-expired role assignments).
 * Account-status checks are omitted — EnsureUserIsActive runs earlier.
 */
class CheckRole
{
    public function __construct(private AuthorizationService $authorizationService) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $allowed = collect($roles)
            ->flatMap(fn($role) => explode('|', $role))
            ->map(fn($role) => trim($role))
            ->filter()
            ->all();

        if ($allowed === [] || !collect($allowed)->contains(
            fn($role) => $this->authorizationService->hasRole($user, $role)
        )) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access for this role.',
                'code'    => 'ROLE_REQUIRED',
            ], 403);
        }

        return $next($request);
    }
}
