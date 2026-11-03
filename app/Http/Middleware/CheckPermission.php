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
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        return $next($request);
    }
}
