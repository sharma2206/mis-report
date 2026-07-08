<?php

namespace App\Services;

use App\Models\Role;
use App\Repositories\RoleRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RoleService
{
    public function __construct(private RoleRepository $repo) {}

    public function all(array $filters = []): Collection
    {
        return $this->repo->all($filters)->map(fn ($role) => $this->format($role));
    }

    public function find(int $id): array
    {
        $role = $this->repo->find($id);
        return array_merge($this->format($role), [
            'permission_ids' => $role->permissions->pluck('id')->toArray(),
            'branches'       => $role->branches->pluck('branch')->toArray(),
        ]);
    }

    public function create(array $data, int $byUserId): array
    {
        $slug = Str::slug($data['name'], '_');
        if (Role::where('slug', $slug)->exists()) {
            $slug .= '_' . time();
        }

        $role = $this->repo->create([
            'name'        => $data['name'],
            'slug'        => $slug,
            'description' => $data['description'] ?? null,
            'type'        => 'custom',
            'is_system'   => false,
            'is_active'   => true,
            'color'       => $data['color'] ?? '#6366f1',
            'icon'        => $data['icon'] ?? null,
        ], $byUserId);

        $this->repo->audit('role.created', $byUserId, 'role', $role->id, $role->name);
        return $this->format($role);
    }

    public function update(int $id, array $data, int $byUserId): array
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            // Only allow updating non-system fields for system roles
            $allowed = array_intersect_key($data, array_flip(['description', 'color', 'icon']));
        } else {
            $allowed = array_intersect_key($data, array_flip(['name', 'description', 'color', 'icon', 'is_active']));
        }

        $updated = $this->repo->update($role, $allowed);
        $this->repo->audit('role.updated', $byUserId, 'role', $role->id, $role->name, $allowed);

        return $this->format($updated);
    }

    public function delete(int $id, int $byUserId): void
    {
        $role = Role::findOrFail($id);
        if ($role->is_system) {
            throw new \RuntimeException('System roles cannot be deleted.');
        }
        $this->repo->audit('role.deleted', $byUserId, 'role', $role->id, $role->name);
        $this->repo->delete($role);
        $this->clearUserPermCaches($role);
    }

    public function clone(int $id, string $newName, int $byUserId): array
    {
        $source = $this->repo->find($id);
        $slug   = Str::slug($newName, '_') . '_' . time();

        $clone = $this->repo->create([
            'name'        => $newName,
            'slug'        => $slug,
            'description' => "Cloned from {$source->name}",
            'type'        => 'custom',
            'is_system'   => false,
            'is_active'   => true,
            'color'       => $source->color,
            'icon'        => $source->icon,
        ], $byUserId);

        $permIds = $source->permissions->pluck('id')->toArray();
        if ($permIds) {
            $this->repo->syncPermissions($clone, $permIds, $byUserId);
        }

        $this->repo->audit('role.cloned', $byUserId, 'role', $clone->id, $clone->name, ['source_id' => $id, 'source_name' => $source->name]);
        return $this->format($clone);
    }

    public function toggle(int $id, int $byUserId): array
    {
        $role = Role::findOrFail($id);
        if ($role->is_system) {
            throw new \RuntimeException('System roles cannot be disabled.');
        }
        $role->update(['is_active' => ! $role->is_active]);
        $this->repo->audit('role.toggled', $byUserId, 'role', $role->id, $role->name, ['is_active' => $role->is_active]);
        $this->clearUserPermCaches($role);
        return $this->format($role->fresh());
    }

    public function syncPermissions(int $roleId, array $permissionIds, int $byUserId): void
    {
        $role = Role::findOrFail($roleId);
        $this->repo->syncPermissions($role, $permissionIds, $byUserId);
        $this->repo->audit('role.permissions_updated', $byUserId, 'role', $role->id, $role->name, [
            'permission_count' => count($permissionIds),
        ]);
        $this->clearUserPermCaches($role);
    }

    public function syncBranches(int $roleId, array $branches, int $byUserId): void
    {
        $role = Role::findOrFail($roleId);
        $this->repo->syncBranches($role, $branches);
        $this->repo->audit('role.branches_updated', $byUserId, 'role', $role->id, $role->name, ['branches' => $branches]);
    }

    public function getPermissionsGrouped(): array
    {
        return $this->repo->getPermissionsGrouped()->map(fn ($group) => [
            'id'      => $group->id,
            'slug'    => $group->slug,
            'name'    => $group->name,
            'icon'    => $group->icon,
            'modules' => $group->permissions
                ->groupBy('module')
                ->map(fn ($perms, $module) => [
                    'module'      => $module,
                    'label'       => ucwords(str_replace('_', ' ', $module)),
                    'permissions' => $perms->map(fn ($p) => [
                        'id'     => $p->id,
                        'slug'   => $p->slug,
                        'action' => $p->action,
                        'label'  => ucwords(str_replace('_', ' ', $p->action)),
                    ])->values(),
                ])->values(),
        ])->toArray();
    }

    public function getRoleUsers(int $roleId): Collection
    {
        return $this->repo->getRoleUsers($roleId);
    }

    public function assignRolesToUser(int $userId, array $roleIds, int $byUserId): void
    {
        $this->repo->assignRolesToUser($userId, $roleIds, $byUserId);
        Cache::forget("user_permissions_{$userId}");
    }

    public function removeRoleFromUser(int $userId, int $roleId, int $byUserId): void
    {
        $this->repo->removeRoleFromUser($userId, $roleId);
        Cache::forget("user_permissions_{$userId}");
    }

    public function getStats(): array
    {
        return $this->repo->getStats();
    }

    public function getAudit(int $roleId): Collection
    {
        return $this->repo->getAudit($roleId);
    }

    public function getAuditAll(array $filters = []): Collection
    {
        return $this->repo->getAuditAll($filters);
    }

    private function format(Role $role): array
    {
        return [
            'id'               => $role->id,
            'name'             => $role->name,
            'slug'             => $role->slug,
            'description'      => $role->description,
            'type'             => $role->type,
            'is_system'        => $role->is_system,
            'is_active'        => $role->is_active,
            'color'            => $role->color,
            'icon'             => $role->icon,
            'user_count'       => $role->users_count ?? $role->user_count,
            'permission_count' => $role->permissions_count ?? $role->permission_count,
            'branches'         => $role->relationLoaded('branches') ? $role->branches->pluck('branch')->toArray() : [],
            'created_at'       => $role->created_at?->toDateString(),
        ];
    }

    private function clearUserPermCaches(Role $role): void
    {
        foreach ($role->users as $user) {
            Cache::forget("user_permissions_{$user->id}");
        }
    }
}
