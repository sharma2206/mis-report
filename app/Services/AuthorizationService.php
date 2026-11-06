<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class AuthorizationService
{
    /**
     * Active, non-expired RBAC role assignments for the user.
     *
     * Both the role and the pivot assignment must pass the expiry check.
     */
    public function getEffectiveRoles(User $user): Collection
    {
        return $user->roles()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('user_roles.expires_at')
                    ->orWhereDate('user_roles.expires_at', '>=', now());
            })
            ->get();
    }

    public function getEffectivePermissions(User $user): array
    {
        return array_values(array_unique($user->getAllPermissions()));
    }

    /**
     * Check whether the user holds a specific role (by slug or name).
     *
     * No legacy admin bypass — the role must be an active, non-expired
     * RBAC role assignment.
     */
    public function hasRole(User $user, string $role): bool
    {
        $needle = strtolower(trim($role));

        if ($needle === '') {
            return false;
        }

        return $this->getEffectiveRoles($user)
            ->contains(
                fn($r) =>
                strtolower((string) $r->slug) === $needle ||
                    strtolower((string) $r->name) === $needle
            );
    }

    /**
     * Check a single permission.
     *
     * No isAdmin() bypass — authorization is entirely through RBAC or the
     * controlled legacy fallback inside HasRoles::getAllPermissions().
     */
    public function hasPermission(User $user, string $permission): bool
    {
        return $user->hasPermission($permission);
    }

    /**
     * OR-based permission check: user must hold at least one of the given permissions.
     */
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

    /**
     * AND-based permission check: user must hold all of the given permissions.
     */
    public function hasAllPermissions(User $user, array|string ...$permissions): bool
    {
        $items = collect($permissions)
            ->flatMap(fn($value) => is_array($value) ? $value : [$value])
            ->filter(fn($value) => is_string($value) && trim($value) !== '')
            ->map(fn($value) => trim($value))
            ->all();

        return empty($items)
            ? false
            : collect($items)->every(fn($permission) => $this->hasPermission($user, $permission));
    }

    /**
     * Branch access check.
     *
     * No isAdmin() bypass — the 'branch.global_access' permission is the
     * explicit, documented path for unrestricted branch access.
     */
    public function canAccessBranch(User $user, mixed $branch): bool
    {
        return $user->canAccessBranch($branch);
    }

    /**
     * Department access check.
     *
     * No isAdmin() bypass — user must have an explicit department assignment.
     * Null / empty department context passes (endpoint does not require department).
     */
    public function canAccessDepartment(User $user, mixed $department): bool
    {
        if ($department === null || $department === '' || $department === []) {
            return true;
        }

        // Users with global branch access also bypass department restrictions.
        if ($user->hasGlobalBranchAccess()) {
            return true;
        }

        $allowed   = $user->getDepartmentListAttribute();
        $requested = is_array($department)
            ? $department
            : array_filter(array_map('trim', explode(',', (string) $department)));

        foreach ($requested as $item) {
            if ($item === null || trim((string) $item) === '') {
                continue;
            }

            if (!in_array(trim((string) $item), $allowed, true)) {
                return false;
            }
        }

        return true;
    }

    public function resolveUserContext(User $user, mixed $branch = null, mixed $department = null): array
    {
        $effectiveRoles = $this->getEffectiveRoles($user)->map(fn($role) => [
            'id'   => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
        ])->values()->all();

        return [
            'user_id'              => $user->id,
            'roles'                => $effectiveRoles,
            'permissions'          => $this->getEffectivePermissions($user),
            'branches'             => $user->getBranchListAttribute(),
            'departments'          => $user->getDepartmentListAttribute(),
            'has_global_branch'    => $user->hasGlobalBranchAccess(),
            'default_branch'       => $user->branch,
            'default_department'   => $user->department,
            'requested_branch'     => $branch,
            'requested_department' => $department,
        ];
    }
}
