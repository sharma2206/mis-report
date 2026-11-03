<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Usage: ->middleware('permission:mis_report.view')
     *        ->middleware('permission:mis_report.export|mis_report.print')
     * Pipe-separated slugs are OR. The user needs one of them.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if ($user->locked_at !== null || ! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is disabled or locked.',
                'code' => 'ACCOUNT_DISABLED',
            ], 403);
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

        if ($allowed === [] || ! $user->hasAnyPermission(...$allowed)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to access this resource.',
                'code' => 'PERMISSION_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
