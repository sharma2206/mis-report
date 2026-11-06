<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces permission-based access control.
 *
 * Usage:
 *   ->middleware('permission:mis_report.view')
 *   ->middleware('permission:mis_report.export|mis_report.print')   // OR logic
 *
 * Pipe-separated slugs are OR — the user needs at least one of them.
 *
 * Account-status checks are intentionally omitted here because EnsureUserIsActive
 * already runs earlier in the middleware stack.
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $allowed = [];
        foreach ($permissions as $permission) {
            foreach (explode('|', $permission) as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $allowed[] = $part;
                }
            }
        }

        if ($allowed === [] || !$user->hasAnyPermission(...$allowed)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to access this resource.',
                'code'    => 'PERMISSION_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
