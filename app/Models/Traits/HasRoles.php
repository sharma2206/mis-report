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
        return Cache::remember("user_permissions_{$this->id}", 300, function () {
            // Legacy admin bypass — retains backward-compat while RBAC is seeded.
            if ($this->role === 'admin') {
                return ['*'];
            }

            $roles = $this->roles()
                ->where('is_active', true)
                ->where(function ($q) {
                    // Role assignment is valid if it has no expiry OR the expiry is in the future.
                    // The closure is essential so the OR does not escape the is_active=true scope.
                    $q->whereNull('user_roles.expires_at')
                      ->orWhereDate('user_roles.expires_at', '>=', now());
                })
                ->with('permissions:id,slug')
                ->get();

            // An assigned RBAC role replaces the legacy column, even if it grants nothing.
            if ($roles->isNotEmpty()) {
                return $roles
                    ->flatMap(fn ($r) => $r->permissions->pluck('slug'))
                    ->unique()
                    ->values()
                    ->all();
            }

            return LegacyRolePermissions::for($this->role);
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
        return collect($permissions)->contains(fn ($p) => $this->hasPermission($p));
    }

    public function clearPermissionCache(): void
    {
        Cache::forget("user_permissions_{$this->id}");
    }
}
