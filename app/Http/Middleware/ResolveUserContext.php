<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveUserContext
{
    public function __construct(private AuthorizationService $authorizationService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $context = $this->authorizationService->resolveUserContext(
            $user,
            $request->route('branch') ?? $request->input('branch'),
            $request->route('department') ?? $request->input('department')
        );

        $request->attributes->set('user_context', $context);

        return $next($request);
    }
}
