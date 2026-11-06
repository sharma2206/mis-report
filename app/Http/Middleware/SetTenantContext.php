<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the tenant context for this request from the authenticated user.
 *
 * MUST run after auth:sanctum so the user is already resolved.
 *
 * Security requirements:
 * - Tenant id always comes from the trusted authenticated user record.
 * - Incoming request data (body / query params) NEVER override tenant id.
 * - A user with no tenant_id is rejected — no silent default-tenant fallback.
 * - Tenant context is always cleared in the finally block after the request.
 */
class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $tenantId = $user->tenant_id;

            if (!$tenantId) {
                // Authenticated user has no tenant assignment — reject the request.
                // This prevents a misconfigured user from silently inheriting the
                // default tenant's data.
                return response()->json([
                    'success' => false,
                    'message' => 'User has no tenant assignment. Contact your administrator.',
                    'code'    => 'NO_TENANT',
                ], 403);
            }

            TenantContext::set((int) $tenantId);
        }

        try {
            return $next($request);
        } finally {
            TenantContext::forget();
        }
    }
}
