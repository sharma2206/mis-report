<?php

use App\Http\Middleware\CheckBranchAccess;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsureDepartmentAccess;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\ResolveUserContext;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Security headers on every response.
        $middleware->append(SecurityHeaders::class);

        // Sanctum stateful SPA support.
        $middleware->statefulApi();

        // Canonical middleware aliases.
        // Each concept has exactly one alias — no duplicates.
        $middleware->alias([
            'tenant'            => SetTenantContext::class,
            'user.active'       => EnsureUserIsActive::class,
            'resolve.user'      => ResolveUserContext::class,
            'permission'        => CheckPermission::class,
            'role'              => CheckRole::class,
            'branch.access'     => CheckBranchAccess::class,
            'department.access' => EnsureDepartmentAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Return JSON for unauthenticated API requests instead of redirecting.
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || str_starts_with($request->path(), 'api/')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });
    })->create();
