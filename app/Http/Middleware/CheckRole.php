<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Usage: ->middleware('role:staff|manager|admin')
     * Accepts pipe-separated list of allowed roles.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        // Roles may arrive as a single "staff|manager|admin" argument or multiple args.
        $allowed = [];
        foreach ($roles as $r) {
            foreach (explode('|', $r) as $part) {
                $allowed[] = trim($part);
            }
        }

        if (! in_array($user->role, $allowed, true)) {
            return response()->json(['success' => false, 'message' => 'Insufficient role.'], 403);
        }

        return $next($request);
    }
}
