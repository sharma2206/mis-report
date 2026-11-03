<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function __construct(private AuthorizationService $authorizationService) {}

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

        if ($user->locked_at !== null || ! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is disabled or locked.',
                'code' => 'ACCOUNT_DISABLED',
            ], 403);
        }

        $allowed = collect($roles)
            ->flatMap(fn($role) => explode('|', $role))
            ->map(fn($role) => trim($role))
            ->filter()
            ->all();

        if ($allowed === [] || ! collect($allowed)->contains(fn($role) => $this->authorizationService->hasRole($user, $role))) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access for this role.',
                'code' => 'ROLE_REQUIRED',
            ], 403);
        }

        return $next($request);
    }
}
