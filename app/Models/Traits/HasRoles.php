<?php

namespace App\Models\Traits;

use App\Models\Role;
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
        // Legacy admin bypass — retains backward-compat while RBAC is seeded
        if ($this->role === 'admin') {
            return ['*'];
        }

        return Cache::remember("user_permissions_{$this->id}", 300, function () {
            return $this->roles()
                ->where('is_active', true)
                ->whereNull('user_roles.expires_at')
                ->orWhereDate('user_roles.expires_at', '>=', now())
                ->with('permissions:id,slug')
                ->get()
                ->flatMap(fn ($r) => $r->permissions->pluck('slug'))
                ->unique()
                ->values()
                ->toArray();
        });
    }

    public function hasPermission(string $permission): bool
    {
        $perms = $this->getAllPermissions();
        return in_array('*', $perms, true) || in_array($permission, $perms, true);
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
