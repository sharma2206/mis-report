<?php

namespace App\Repositories;

use App\Models\LoginLog;
use App\Models\PasswordHistory;
use App\Models\User;
use App\Models\UserBranch;
use App\Models\UserDepartment;
use App\Models\UserProfile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class UserRepository
{
    public function paginate(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        return User::query()
            ->with(['profile', 'userBranches', 'userDepartments', 'roles:id,name,slug,color', 'reportingManager:id,name'])
            ->when($filters['search'] ?? null, function ($q, $s) {
                $q->where(function ($q2) use ($s) {
                    $q2->where('name', 'like', "%{$s}%")
                       ->orWhere('email', 'like', "%{$s}%")
                       ->orWhere('employee_id', 'like', "%{$s}%")
                       ->orWhere('mobile', 'like', "%{$s}%");
                });
            })
            ->when($filters['branch'] ?? null, function ($q, $b) {
                $q->where(function ($q2) use ($b) {
                    $q2->where('branch', $b)
                       ->orWhereHas('userBranches', fn ($q3) => $q3->where('branch', $b));
                });
            })
            ->when($filters['role'] ?? null, fn ($q, $r) => $q->where('role', $r))
            ->when($filters['department'] ?? null, fn ($q, $d) => $q->where('department', $d))
            ->when($filters['employment_status'] ?? null, fn ($q, $es) => $q->where('employment_status', $es))
            ->when(isset($filters['status']), function ($q) use ($filters) {
                match ($filters['status']) {
                    'active'   => $q->where('is_active', true)->whereNull('locked_at'),
                    'inactive' => $q->where('is_active', false),
                    'locked'   => $q->whereNotNull('locked_at'),
                    default    => null,
                };
            })
            ->orderBy($filters['sort_by'] ?? 'created_at', $filters['sort_dir'] ?? 'desc')
            ->paginate($perPage);
    }

    public function all(array $filters = []): Collection
    {
        return User::query()
            ->select('id', 'name', 'email', 'role', 'branch', 'is_active', 'employee_id', 'designation', 'department')
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->get();
    }

    public function find(int $id): User
    {
        return User::with([
            'profile',
            'userBranches',
            'userDepartments',
            'roles:id,name,slug,color,description',
            'reportingManager:id,name,email',
            'loginLogs' => fn ($q) => $q->latest('created_at')->limit(20),
        ])->findOrFail($id);
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function update(User $user, array $data): User
    {
        $user->update($data);
        return $user->fresh();
    }

    public function delete(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->userBranches()->delete();
            $user->userDepartments()->delete();
            $user->roles()->detach();
            $user->profile()->delete();
            $user->delete();
        });
    }

    public function upsertProfile(int $userId, array $data): UserProfile
    {
        return UserProfile::updateOrCreate(['user_id' => $userId], $data);
    }

    public function syncBranches(int $userId, array $branches): void
    {
        UserBranch::where('user_id', $userId)->delete();
        foreach (array_unique($branches) as $branch) {
            UserBranch::create(['user_id' => $userId, 'branch' => $branch]);
        }
    }

    public function syncDepartments(int $userId, array $departments): void
    {
        UserDepartment::where('user_id', $userId)->delete();
        foreach (array_unique($departments) as $dept) {
            UserDepartment::create(['user_id' => $userId, 'department' => $dept]);
        }
    }

    public function syncRoles(int $userId, array $roleIds, int $byUserId): void
    {
        $user = User::findOrFail($userId);
        $pivot = collect($roleIds)->mapWithKeys(fn ($id) => [
            $id => ['assigned_by' => $byUserId, 'assigned_at' => now()],
        ])->toArray();
        $user->roles()->sync($pivot);
        $user->clearPermissionCache();
    }

    public function getStats(): array
    {
        $total    = User::count();
        $active   = User::where('is_active', true)->whereNull('locked_at')->count();
        $inactive = User::where('is_active', false)->count();
        $locked   = User::whereNotNull('locked_at')->count();
        $admins   = User::where('role', 'admin')->count();
        $doctors  = User::whereHas('roles', fn ($q) => $q->where('slug', 'doctor'))
                        ->orWhere('designation', 'like', 'Dr.%')
                        ->count();
        $newThisMonth = User::whereMonth('created_at', now()->month)
                            ->whereYear('created_at', now()->year)
                            ->count();
        $recentLogins = User::whereNotNull('last_login_at')
                            ->where('last_login_at', '>=', now()->subDay())
                            ->count();

        return compact('total', 'active', 'inactive', 'locked', 'admins', 'doctors', 'newThisMonth', 'recentLogins');
    }

    public function getLoginLogs(int $userId, int $limit = 30): Collection
    {
        return LoginLog::where('user_id', $userId)
            ->latest('created_at')
            ->limit($limit)
            ->get();
    }

    public function recordLoginLog(int $userId, string $event, array $context = []): void
    {
        LoginLog::record($userId, $event, $context['meta'] ?? [], $context['ip'] ?? null, $context['ua'] ?? null);
    }

    public function addPasswordHistory(int $userId, string $hash): void
    {
        PasswordHistory::create(['user_id' => $userId, 'password_hash' => $hash]);
        // Keep only last 5
        PasswordHistory::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->skip(5)->take(100)->delete();
    }
}
