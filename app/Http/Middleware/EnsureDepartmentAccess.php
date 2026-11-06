<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces department-level access control.
 *
 * - If no department is specified in the request, the middleware passes
 *   (endpoint does not require department context).
 * - If a department is specified it must be in the user's assigned set,
 *   unless the user holds 'branch.global_access' (unrestricted users).
 * - Requested departments are validated against the user's assignments.
 * - Rejects with HTTP 403 for unauthorized departments.
 *
 * Account-status checks are omitted — EnsureUserIsActive runs earlier.
 */
class EnsureDepartmentAccess
{
    public function __construct(private AuthorizationService $authorizationService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user       = $request->user();
        $department = $request->route('department') ?? $request->input('department');

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        // No department requested — pass through (optional context endpoint).
        if ($department === null || $department === '' || $department === []) {
            return $next($request);
        }

        if (!$this->authorizationService->canAccessDepartment($user, $department)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied for this department.',
                'code'    => 'DEPARTMENT_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
