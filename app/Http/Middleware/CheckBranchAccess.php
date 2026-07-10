<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBranchAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        // Route param takes precedence; fall back to query/body param so
        // analytics-style endpoints (?branch=...) are also branch-scoped.
        $branch = $request->route('branch') ?? $request->input('branch');

        if ($branch && ! $request->user()?->canAccessBranch($branch)) {
            return response()->json(['success' => false, 'message' => 'Access denied for this branch.'], 403);
        }

        return $next($request);
    }
}
