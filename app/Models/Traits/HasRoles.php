<?php

namespace App\Models\Traits;

use App\Models\Role;
use App\Support\LegacyRolePermissions;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

trait HasRoles
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
            ->withPivot('assigned_by', 'assigned_at', 'expires_at');
    }

    /**
     * Returns permissions from active, non-expired RBAC role assignments.
     *
     * Returns an array tagged with '__has_rbac_roles__' when the user has at
     * least one active, non-expired role assignment so that getAllPermissions()
     * can distinguish "has roles with zero permissions" from "has no roles at all".
     *
     * @return array{__has_rbac_roles__: bool, perms: string[]}|array{}
     */
    protected function activeRolePermissions(): array
    {
        $roles = $this->roles()
            ->where('is_active', true)
            ->where(function ($q) {
                // Role assignment expiry check
                $q->whereNull('user_roles.expires_at')
                    ->orWhereDate('user_roles.expires_at', '>=', now());
            })
            ->with('permissions:id,slug')
            ->get();

        if ($roles->isEmpty()) {
            // No active, non-expired role assignments → allow legacy fallback
            return [];
        }

        $permissions = $roles
            ->flatMap(fn($role) => $role->permissions->pluck('slug'))
            ->filter(fn($slug) => is_string($slug) && $slug !== '')
            ->unique()
            ->values()
            ->all();

        // Tag the result so getAllPermissions() knows a real RBAC role exists
        // even when the role carries zero permissions.
        return ['__has_rbac_roles__' => true, 'perms' => $permissions];
    }

    protected function legacyRolePermissions(): array
    {
        $legacyRole = strtolower(trim((string) ($this->role ?? '')));

        if ($legacyRole === '') {
            return [];
        }

        // Wildcard is intentional here — it is ONLY used when the user has
        // no active RBAC role assignment at all (pure legacy fallback).
        if (in_array($legacyRole, [
            'admin', 'administrator', 'super-admin', 'super_admin',
            'system_administrator', 'hospital_administrator',
            'branch_administrator', 'it_administrator',
        ], true)) {
            return ['*'];
        }

        return LegacyRolePermissions::for($legacyRole);
    }

    /**
     * Effective permission slugs for this user.
     *
     * Cache key is tenant+user scoped to prevent cross-tenant cache collisions.
     *
     * RBAC role assignments take precedence. If the user has at least one
     * active, non-expired RBAC role the legacy fallback is NOT used — even
     * when that RBAC role carries zero permissions.
     */
    public function getAllPermissions(): array
    {
        $userId   = (int) ($this->getKey() ?? 0);
        $tenantId = (int) ($this->tenant_id ?? 0);

        return Cache::remember("user_permissions_{$tenantId}_{$userId}", 300, function () {
            $result = $this->activeRolePermissions();

            // User has active RBAC role(s) — always use that set, even if empty.
            if (!empty($result['__has_rbac_roles__'])) {
                return $result['perms'];
            }

            // No active RBAC role assignments → use legacy role-string permissions.
            return $this->legacyRolePermissions();
        });
    }

    public function hasPermission(string $permission): bool
    {
        $perms = $this->getAllPermissions();

        if (in_array('*', $perms, true) || in_array($permission, $perms, true)) {
            return true;
        }

        $module = strstr($permission, '.', true);

        return $module !== false && in_array($module . '.*', $perms, true);
    }

    public function hasAnyPermission(string ...$permissions): bool
    {
        return collect($permissions)->contains(fn($p) => $this->hasPermission($p));
    }

    public function clearPermissionCache(): void
    {
        $userId   = (int) ($this->getKey() ?? 0);
        $tenantId = (int) ($this->tenant_id ?? 0);
        Cache::forget("user_permissions_{$tenantId}_{$userId}");
    }
}
