<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class AuthorizationService
{
    public function getEffectiveRoles(User $user): Collection
    {
        return $user->roles()
            ->where('is_active', true)
            ->get();
    }

    public function getEffectivePermissions(User $user): array
    {
        return array_values(array_unique($user->getAllPermissions()));
    }

    public function hasRole(User $user, string $role): bool
    {
        $needle = strtolower(trim($role));

        if ($needle === '') {
            return false;
        }

        return $this->getEffectiveRoles($user)
            ->contains(fn($r) => strtolower((string) $r->slug) === $needle || strtolower((string) $r->name) === $needle);
    }

    public function hasPermission(User $user, string $permission): bool
    {
        return $user->hasPermission($permission);
    }

    public function hasAnyPermission(User $user, array|string ...$permissions): bool
    {
        $items = collect($permissions)
            ->flatMap(fn($value) => is_array($value) ? $value : [$value])
            ->filter(fn($value) => is_string($value) && trim($value) !== '')
            ->map(fn($value) => trim($value))
            ->all();

        if ($items === []) {
            return false;
        }

        return collect($items)->contains(fn($permission) => $this->hasPermission($user, $permission));
    }

    public function hasAllPermissions(User $user, array|string ...$permissions): bool
    {
        $items = collect($permissions)
            ->flatMap(fn($value) => is_array($value) ? $value : [$value])
            ->filter(fn($value) => is_string($value) && trim($value) !== '')
            ->map(fn($value) => trim($value))
            ->all();

        return empty($items) ? false : collect($items)->every(fn($permission) => $this->hasPermission($user, $permission));
    }

    public function canAccessBranch(User $user, mixed $branch): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->canAccessBranch($branch);
    }

    public function canAccessDepartment(User $user, mixed $department): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($department === null || $department === '' || $department === []) {
            return true;
        }

        $allowed = $user->getDepartmentListAttribute();
        $requested = is_array($department) ? $department : explode(',', (string) $department);

        foreach ($requested as $item) {
            if ($item === null || trim((string) $item) === '') {
                continue;
            }

            if (! in_array(trim((string) $item), $allowed, true)) {
                return false;
            }
        }

        return true;
    }

    public function resolveUserContext(User $user, mixed $branch = null, mixed $department = null): array
    {
        $effectiveRoles = $this->getEffectiveRoles($user)->map(fn($role) => [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
        ])->values()->all();

        return [
            'user_id' => $user->id,
            'roles' => $effectiveRoles,
            'permissions' => $this->getEffectivePermissions($user),
            'branches' => $user->getBranchListAttribute(),
            'departments' => $user->getDepartmentListAttribute(),
            'default_branch' => $user->branch,
            'default_department' => $user->department,
            'requested_branch' => $branch,
            'requested_department' => $department,
        ];
    }
}
