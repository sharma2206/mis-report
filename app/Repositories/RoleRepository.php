<?php

namespace App\Repositories;

use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\Role;
use App\Models\RoleBranch;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RoleRepository
{
    public function all(array $filters = []): Collection
    {
        return Role::withCount(['users', 'permissions'])
            ->with('branches')
            ->when(isset($filters['search']), fn ($q) => $q->where('name', 'like', "%{$filters['search']}%"))
            ->when(isset($filters['is_active']), fn ($q) => $q->where('is_active', $filters['is_active']))
            ->when(isset($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->get();
    }

    public function find(int $id): Role
    {
        return Role::withCount(['users', 'permissions'])
            ->with(['permissions:id', 'branches'])
            ->findOrFail($id);
    }

    public function create(array $data, int $byUserId): Role
    {
        return Role::create(array_merge($data, ['created_by' => $byUserId]));
    }

    public function update(Role $role, array $data): Role
    {
        $role->update($data);
        return $role->fresh(['branches']);
    }

    public function delete(Role $role): void
    {
        $role->users()->detach();
        $role->permissions()->detach();
        $role->branches()->delete();
        $role->delete();
    }

    public function syncPermissions(Role $role, array $permissionIds, int $byUserId): void
    {
        $pivot = collect($permissionIds)->mapWithKeys(fn ($id) => [
            $id => ['granted_by' => $byUserId, 'granted_at' => now()],
        ])->toArray();
        $role->permissions()->sync($pivot);
    }

    public function syncBranches(Role $role, array $branches): void
    {
        $role->branches()->delete();
        foreach (array_unique($branches) as $branch) {
            RoleBranch::create(['role_id' => $role->id, 'branch' => $branch]);
        }
    }

    public function getRoleUsers(int $roleId): Collection
    {
        return User::select('users.id', 'users.name', 'users.email', 'users.role', 'users.branch', 'user_roles.assigned_at')
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->where('user_roles.role_id', $roleId)
            ->orderBy('users.name')
            ->get();
    }

    public function assignRolesToUser(int $userId, array $roleIds, int $byUserId): void
    {
        $pivot = collect($roleIds)->mapWithKeys(fn ($id) => [
            $id => ['assigned_by' => $byUserId, 'assigned_at' => now()],
        ])->toArray();
        User::findOrFail($userId)->roles()->sync($pivot);
    }

    public function removeRoleFromUser(int $userId, int $roleId): void
    {
        User::findOrFail($userId)->roles()->detach($roleId);
    }

    public function getPermissionsGrouped(): Collection
    {
        return PermissionGroup::with(['permissions' => fn ($q) => $q->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get();
    }

    public function getStats(): array
    {
        $totalRoles   = Role::count();
        $activeRoles  = Role::where('is_active', true)->count();
        $customRoles  = Role::where('type', 'custom')->count();
        $totalPerms   = Permission::count();
        $usersWithRole = DB::table('user_roles')->distinct('user_id')->count('user_id');

        return compact('totalRoles', 'activeRoles', 'customRoles', 'totalPerms', 'usersWithRole');
    }

    public function getAudit(int $roleId, int $limit = 30): Collection
    {
        return DB::table('rbac_audit_logs as r')
            ->leftJoin('users as u', 'r.actor_id', '=', 'u.id')
            ->select('r.*', 'u.name as actor_name')
            ->where('r.target_type', 'role')
            ->where('r.target_id', $roleId)
            ->orderByDesc('r.created_at')
            ->limit($limit)
            ->get();
    }

    public function getAuditAll(array $filters = [], int $limit = 50): Collection
    {
        return DB::table('rbac_audit_logs as r')
            ->leftJoin('users as u', 'r.actor_id', '=', 'u.id')
            ->select('r.*', 'u.name as actor_name')
            ->when(isset($filters['target_type']), fn ($q) => $q->where('r.target_type', $filters['target_type']))
            ->orderByDesc('r.created_at')
            ->limit($limit)
            ->get();
    }

    public function audit(string $action, int $actorId, string $targetType, int $targetId, string $targetName, array $meta = [], ?string $ip = null): void
    {
        DB::table('rbac_audit_logs')->insert([
            'actor_id'    => $actorId,
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'target_name' => $targetName,
            'meta'        => $meta ? json_encode($meta) : null,
            'ip_address'  => $ip,
            'created_at'  => now(),
        ]);
    }
}
