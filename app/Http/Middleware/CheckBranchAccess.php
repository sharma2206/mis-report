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
        $user = $request->user();

        if (! $branch && $user?->restrictsBranches()) {
            $allowed = $user->branch_list;
            if ($allowed === []) {
                return response()->json(['success' => false, 'message' => 'No branch access is assigned.'], 403);
            }

            $request->merge(['branch' => $allowed]);
            $branch = $allowed;
        }

        if ($branch && ! $user?->canAccessBranch($branch)) {
            return response()->json(['success' => false, 'message' => 'Access denied for this branch.'], 403);
        }

        return $next($request);
    }
}
