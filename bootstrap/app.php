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

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // $middleware->append(SecurityHeaders::class);

        $middleware->statefulApi();

        // $middleware->alias([
        //     'tenant'            => SetTenantContext::class,
        //     'branch.access'     => CheckBranchAccess::class,
        //     'ensure.branch'     => CheckBranchAccess::class,
        //     'user.active'       => EnsureUserIsActive::class,
        //     'active.user'       => EnsureUserIsActive::class,
        //     'department.access' => EnsureDepartmentAccess::class,
        //     'ensure.department' => EnsureDepartmentAccess::class,
        //     'resolve.user'      => ResolveUserContext::class,
        //     'permission'        => CheckPermission::class,
        //     'role'              => CheckRole::class,
        //     'check.permission'  => CheckPermission::class,
        //     'check.role'        => CheckRole::class,
        // ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
