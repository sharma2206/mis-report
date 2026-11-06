<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies that the authenticated user's account is active and not locked.
 *
 * Runs after auth:sanctum and before permission / branch middleware.
 * Returns HTTP 403 with ACCOUNT_DISABLED code — not 401 — because the user
 * IS authenticated; they are simply not authorized due to account status.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if ($user->locked_at !== null || !$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is disabled or locked.',
                'code'    => 'ACCOUNT_DISABLED',
            ], 403);
        }

        return $next($request);
    }
}
