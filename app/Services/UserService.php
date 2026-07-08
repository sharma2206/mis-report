<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(private UserRepository $repo) {}

    public function list(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        return $this->repo->paginate($filters, $perPage);
    }

    public function allForSelect(): Collection
    {
        return $this->repo->all();
    }

    public function find(int $id): User
    {
        return $this->repo->find($id);
    }

    public function create(array $data, int $byUserId, ?object $request = null): User
    {
        return DB::transaction(function () use ($data, $byUserId, $request) {
            $user = $this->repo->create([
                'name'                  => $data['name'],
                'email'                 => $data['email'],
                'password'              => $data['password'],
                'role'                  => $data['role'] ?? 'viewer',
                'branch'                => $data['branch'] ?? null,
                'is_active'             => true,
                'employee_id'           => $data['employee_id'] ?? null,
                'employee_code'         => $data['employee_code'] ?? null,
                'mobile'                => $data['mobile'] ?? null,
                'designation'           => $data['designation'] ?? null,
                'department'            => $data['department'] ?? null,
                'speciality'            => $data['speciality'] ?? null,
                'reporting_manager_id'  => $data['reporting_manager_id'] ?? null,
                'date_of_joining'       => $data['date_of_joining'] ?? null,
                'employment_status'     => $data['employment_status'] ?? 'active',
                'mfa_enabled'           => $data['mfa_enabled'] ?? false,
                'password_changed_at'   => now(),
            ]);

            $this->repo->upsertProfile($user->id, [
                'display_name'             => $data['display_name'] ?? $data['name'],
                'emergency_contact_name'   => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone'  => $data['emergency_contact_phone'] ?? null,
                'bio'                      => $data['bio'] ?? null,
                'notes'                    => $data['notes'] ?? null,
            ]);

            if (! empty($data['role_ids'])) {
                $this->repo->syncRoles($user->id, $data['role_ids'], $byUserId);
            }

            if (! empty($data['branches'])) {
                $this->repo->syncBranches($user->id, $data['branches']);
            }

            if (! empty($data['departments'])) {
                $this->repo->syncDepartments($user->id, $data['departments']);
            }

            $this->repo->addPasswordHistory($user->id, $user->password);

            AuditLog::record('user_created', [
                'target_id' => $user->id,
                'email'     => $user->email,
                'role'      => $user->role,
            ], null, $byUserId, $request);

            return $user;
        });
    }

    public function update(int $id, array $data, int $byUserId, ?object $request = null): User
    {
        return DB::transaction(function () use ($id, $data, $byUserId, $request) {
            $user = User::findOrFail($id);

            $userFields = array_intersect_key($data, array_flip([
                'name', 'email', 'role', 'branch', 'employee_id', 'employee_code',
                'mobile', 'designation', 'department', 'speciality',
                'reporting_manager_id', 'date_of_joining', 'employment_status', 'mfa_enabled', 'avatar',
            ]));

            if (! empty($data['password'])) {
                $userFields['password']          = $data['password'];
                $userFields['password_changed_at'] = now();
                $this->repo->addPasswordHistory($user->id, Hash::make($data['password']));
            }

            $this->repo->update($user, $userFields);

            $profileFields = array_intersect_key($data, array_flip([
                'display_name', 'emergency_contact_name', 'emergency_contact_phone', 'bio', 'notes', 'timezone',
            ]));
            if ($profileFields) {
                $this->repo->upsertProfile($id, $profileFields);
            }

            if (array_key_exists('role_ids', $data)) {
                $this->repo->syncRoles($id, $data['role_ids'], $byUserId);
            }

            if (array_key_exists('branches', $data)) {
                $this->repo->syncBranches($id, $data['branches']);
            }

            if (array_key_exists('departments', $data)) {
                $this->repo->syncDepartments($id, $data['departments']);
            }

            AuditLog::record('user_updated', [
                'target_id' => $id,
                'changes'   => array_keys($userFields),
            ], null, $byUserId, $request);

            return $this->repo->find($id);
        });
    }

    public function delete(int $id, int $byUserId, ?object $request = null): void
    {
        $user = User::findOrFail($id);
        if ($user->id === $byUserId) {
            throw new \RuntimeException('You cannot delete your own account.');
        }

        AuditLog::record('user_deleted', ['target_id' => $id, 'email' => $user->email], null, $byUserId, $request);
        $this->repo->delete($user);
    }

    public function activate(int $id, int $byUserId, ?object $request = null): User
    {
        $user = User::findOrFail($id);
        $this->repo->update($user, ['is_active' => true]);
        AuditLog::record('user_activated', ['target_id' => $id], null, $byUserId, $request);
        return $user->fresh();
    }

    public function deactivate(int $id, int $byUserId, ?object $request = null): User
    {
        $user = User::findOrFail($id);
        if ($user->id === $byUserId) {
            throw new \RuntimeException('You cannot deactivate your own account.');
        }
        $this->repo->update($user, ['is_active' => false]);
        AuditLog::record('user_deactivated', ['target_id' => $id], null, $byUserId, $request);
        return $user->fresh();
    }

    public function lock(int $id, int $byUserId, ?object $request = null): User
    {
        $user = User::findOrFail($id);
        $this->repo->update($user, ['locked_at' => now()]);
        $this->repo->recordLoginLog($id, 'locked', ['ip' => $request?->ip()]);
        AuditLog::record('user_locked', ['target_id' => $id], null, $byUserId, $request);
        return $user->fresh();
    }

    public function unlock(int $id, int $byUserId, ?object $request = null): User
    {
        $user = User::findOrFail($id);
        $this->repo->update($user, ['locked_at' => null, 'failed_login_attempts' => 0]);
        $this->repo->recordLoginLog($id, 'unlocked', ['ip' => $request?->ip()]);
        AuditLog::record('user_unlocked', ['target_id' => $id], null, $byUserId, $request);
        return $user->fresh();
    }

    public function resetPassword(int $id, string $newPassword, int $byUserId, bool $forceChange = true, ?object $request = null): void
    {
        $user = User::findOrFail($id);
        $user->update([
            'password'          => $newPassword,
            'password_changed_at' => $forceChange ? null : now(),
        ]);
        $this->repo->addPasswordHistory($id, Hash::make($newPassword));
        $this->repo->recordLoginLog($id, 'password_reset', ['ip' => $request?->ip(), 'meta' => ['by' => $byUserId]]);
        AuditLog::record('password_reset', ['target_id' => $id, 'by' => $byUserId], null, $byUserId, $request);
    }

    public function clone(int $id, array $overrides, int $byUserId, ?object $request = null): User
    {
        $source = $this->repo->find($id);
        $tempPassword = Str::random(12);

        $cloneData = [
            'name'              => $overrides['name'],
            'email'             => $overrides['email'],
            'password'          => $tempPassword,
            'role'              => $source->role,
            'branch'            => $source->branch,
            'designation'       => $source->designation,
            'department'        => $source->department,
            'employment_status' => $source->employment_status,
            'role_ids'          => $source->roles->pluck('id')->toArray(),
            'branches'          => $source->userBranches->pluck('branch')->toArray(),
            'departments'       => $source->userDepartments->pluck('department')->toArray(),
        ];

        $user = $this->create($cloneData, $byUserId, $request);
        AuditLog::record('user_cloned', ['source_id' => $id, 'target_id' => $user->id], null, $byUserId, $request);
        return $user;
    }

    public function bulkAction(string $action, array $userIds, array $data, int $byUserId, ?object $request = null): array
    {
        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        foreach ($userIds as $uid) {
            try {
                match ($action) {
                    'activate'   => $this->activate($uid, $byUserId, $request),
                    'deactivate' => $this->deactivate($uid, $byUserId, $request),
                    'lock'       => $this->lock($uid, $byUserId, $request),
                    'unlock'     => $this->unlock($uid, $byUserId, $request),
                    'assign_role' => $this->repo->syncRoles($uid, $data['role_ids'] ?? [], $byUserId),
                    'assign_branch' => $this->repo->syncBranches($uid, $data['branches'] ?? []),
                    'assign_department' => $this->repo->syncDepartments($uid, $data['departments'] ?? []),
                    'delete'     => $this->delete($uid, $byUserId, $request),
                    default      => throw new \InvalidArgumentException("Unknown action: {$action}"),
                };
                $results['success']++;
            } catch (\Throwable $e) {
                $results['failed']++;
                $results['errors'][] = "User {$uid}: {$e->getMessage()}";
            }
        }

        return $results;
    }

    public function export(array $filters = []): string
    {
        $users = $this->repo->paginate($filters, 9999)->items();

        $rows = [['Employee ID', 'Name', 'Email', 'Mobile', 'Role', 'Designation', 'Department', 'Branch', 'Status', 'Employment Status', 'Last Login', 'Created']];

        foreach ($users as $u) {
            $rows[] = [
                $u->employee_id ?? '',
                $u->name,
                $u->email,
                $u->mobile ?? '',
                $u->role,
                $u->designation ?? '',
                $u->department ?? '',
                $u->branch ?? '',
                $u->status,
                $u->employment_status,
                $u->last_login_at?->format('Y-m-d H:i') ?? 'Never',
                $u->created_at->format('Y-m-d'),
            ];
        }

        $csv = '';
        foreach ($rows as $row) {
            $csv .= implode(',', array_map(fn ($v) => '"' . str_replace('"', '""', $v) . '"', $row)) . "\n";
        }
        return $csv;
    }

    public function getStats(): array
    {
        return $this->repo->getStats();
    }

    public function getLoginLogs(int $userId): Collection
    {
        return $this->repo->getLoginLogs($userId);
    }
}
