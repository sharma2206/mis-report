<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBranchAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $branch = $request->route('branch');

        if ($branch && ! $request->user()?->canAccessBranch($branch)) {
            return response()->json(['success' => false, 'message' => 'Access denied for this branch.'], 403);
        }

        return $next($request);
    }
}
