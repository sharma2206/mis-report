<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDepartmentAccess
{
    public function __construct(private AuthorizationService $authorizationService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $department = $request->route('department') ?? $request->input('department');

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        if ($department !== null && ! $this->authorizationService->canAccessDepartment($user, $department)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied for this department.',
                'code' => 'DEPARTMENT_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
