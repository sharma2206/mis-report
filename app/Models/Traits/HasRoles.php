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

    protected function activeRolePermissions(): array
    {
        $roles = $this->roles()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('user_roles.expires_at')
                    ->orWhereDate('user_roles.expires_at', '>=', now());
            })
            ->with('permissions:id,slug')
            ->get();

        if ($roles->isEmpty()) {
            return [];
        }

        return $roles
            ->flatMap(fn($role) => $role->permissions->pluck('slug'))
            ->filter(fn($slug) => is_string($slug) && $slug !== '')
            ->unique()
            ->values()
            ->all();
    }

    protected function legacyRolePermissions(): array
    {
        $legacyRole = strtolower(trim((string) ($this->role ?? '')));

        if ($legacyRole === '') {
            return [];
        }

        if (in_array($legacyRole, ['admin', 'administrator', 'super-admin', 'super_admin', 'system_administrator', 'hospital_administrator', 'branch_administrator', 'it_administrator'], true)) {
            return ['*'];
        }

        return LegacyRolePermissions::for($legacyRole);
    }

    public function getAllPermissions(): array
    {
        $userId = (int) ($this->getKey() ?? 0);

        return Cache::remember("user_permissions_{$userId}", 300, function () {
            $rolePermissions = $this->activeRolePermissions();

            if ($rolePermissions !== []) {
                return $rolePermissions;
            }

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
        Cache::forget("user_permissions_" . ((int) ($this->getKey() ?? 0)));
    }
}
