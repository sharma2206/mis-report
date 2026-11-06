<?php

namespace App\Http\Middleware;

use App\Models\HospitalBranch;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces branch-level access control.
 *
 * Logic:
 * 1. Determines which branch(es) the request targets (route param → query param).
 * 2. For users with 'branch.global_access' permission, all branches are permitted.
 * 3. For restricted users, the requested branch(es) must be in their assignment.
 * 4. If no branch is specified on a restricted-user request:
 *    - The request attributes receive the user's allowed branch list so controllers
 *      can scope queries accordingly (request input is NOT modified).
 *    - If the user has zero branch assignments, the request is rejected.
 * 5. All branch values are validated against the current tenant's branches table.
 *
 * Security note:
 *   This middleware stores the resolved branches in $request->attributes ('allowed_branches')
 *   rather than modifying $request->input(). Controllers reading branch from input()
 *   continue to receive what the client sent; they should use $request->attributes->get()
 *   for the security-enforced list when building queries.
 */
class CheckBranchAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        // Requested branch: route param takes precedence over query/body param.
        $requestedBranch = $request->route('branch') ?? $request->input('branch');

        // ── Global access: user holds explicit 'branch.global_access' permission ──
        if ($user->hasGlobalBranchAccess()) {
            // Validate the requested branch against the tenant, if specified.
            if ($requestedBranch && !is_array($requestedBranch)) {
                if (!$this->branchExistsForTenant($requestedBranch)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid branch for this tenant.',
                        'code'    => 'INVALID_BRANCH',
                    ], 422);
                }
            }

            // Store all tenant branches in attributes for controllers that need them.
            $request->attributes->set('allowed_branches', $this->getTenantBranchKeys());
            return $next($request);
        }

        // ── Restricted user ──────────────────────────────────────────────────
        $userBranches = $user->branch_list;

        if ($userBranches === []) {
            return response()->json([
                'success' => false,
                'message' => 'No branch access is assigned.',
                'code'    => 'NO_BRANCH_ACCESS',
            ], 403);
        }

        if ($requestedBranch) {
            // Normalize to array for consistent handling.
            $requested = is_array($requestedBranch)
                ? $requestedBranch
                : array_filter(array_map('trim', explode(',', (string) $requestedBranch)));

            // Reject the literal "all" token.
            if (in_array('all', $requested, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied for this branch.',
                    'code'    => 'BRANCH_DENIED',
                ], 403);
            }

            // Every requested branch must be in the user's allowed set.
            foreach ($requested as $branch) {
                if (!in_array($branch, $userBranches, true)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied for this branch.',
                        'code'    => 'BRANCH_DENIED',
                    ], 403);
                }
            }

            $request->attributes->set('allowed_branches', $requested);
        } else {
            // No branch specified — give the controller the user's allowed set.
            $request->attributes->set('allowed_branches', $userBranches);
        }

        return $next($request);
    }

    /**
     * Check whether a branch key exists for the current tenant.
     */
    private function branchExistsForTenant(string $key): bool
    {
        $tenantId = TenantContext::id();

        if ($tenantId === null) {
            return false;
        }

        return HospitalBranch::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('key', $key)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Return all active branch keys for the current tenant.
     *
     * @return string[]
     */
    private function getTenantBranchKeys(): array
    {
        $tenantId = TenantContext::id();

        if ($tenantId === null) {
            return [];
        }

        return HospitalBranch::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->pluck('key')
            ->toArray();
    }
}
