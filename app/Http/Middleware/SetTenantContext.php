<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the tenant for this request from the authenticated user.
 * Must run after auth:sanctum so the user is already resolved.
 */
class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $tenantId = $user->tenant_id ?: TenantContext::defaultId();

            if ($tenantId) {
                TenantContext::set((int) $tenantId);
            }
        }

        try {
            return $next($request);
        } finally {
            TenantContext::forget();
        }
    }
}
