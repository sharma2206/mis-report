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

    public function getAllPermissions(): array
    {
        $userId = (int) ($this->getKey() ?? 0);

        return Cache::remember("user_permissions_{$userId}", 300, function () {
            // The authoritative source of permissions is the RBAC role assignment.
            // Legacy role strings are treated only as a compatibility signal for admin-level access;
            // they are no longer used to grant regular application permissions.
            if ($this->isAdmin()) {
                return ['*'];
            }

            $roles = $this->roles()
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('user_roles.expires_at')
                        ->orWhereDate('user_roles.expires_at', '>=', now());
                })
                ->with('permissions:id,slug')
                ->get();

            if ($roles->isNotEmpty()) {
                return $roles
                    ->flatMap(fn($r) => $r->permissions->pluck('slug'))
                    ->filter(fn($slug) => is_string($slug) && $slug !== '')
                    ->unique()
                    ->values()
                    ->all();
            }

            $legacyRole = (string) ($this->role ?? '');
            $legacy = LegacyRolePermissions::for($legacyRole);

            if (! empty($legacy)) {
                return $legacy;
            }

            return [];
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
