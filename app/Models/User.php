<?php

namespace App\Models;

use App\Models\Traits\HasRoles;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password',
        'role',
        'branch',
        'is_active',
        'employee_id',
        'employee_code',
        'mobile',
        'designation',
        'department',
        'speciality',
        'reporting_manager_id',
        'date_of_joining',
        'employment_status',
        'failed_login_attempts',
        'locked_at',
        'last_login_at',
        'last_logout_at',
        'password_changed_at',
        'password_expires_at',
        'mfa_enabled',
        'mfa_secret',
        'avatar',
    ];

    protected $hidden = ['password', 'remember_token', 'mfa_secret'];

    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'password'              => 'hashed',
            'is_active'             => 'boolean',
            'mfa_enabled'           => 'boolean',
            'locked_at'             => 'datetime',
            'last_login_at'         => 'datetime',
            'last_logout_at'        => 'datetime',
            'password_changed_at'   => 'datetime',
            'password_expires_at'   => 'datetime',
            'date_of_joining'       => 'date',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function userBranches(): HasMany
    {
        return $this->hasMany(UserBranch::class);
    }

    public function userDepartments(): HasMany
    {
        return $this->hasMany(UserDepartment::class);
    }

    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class)->latest('created_at');
    }

    public function passwordHistory(): HasMany
    {
        return $this->hasMany(PasswordHistory::class)->latest('created_at');
    }

    public function reportingManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporting_manager_id');
    }

    public function reportees(): HasMany
    {
        return $this->hasMany(User::class, 'reporting_manager_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Primary branch relation (branch stored as string key).
     */
    public function primaryBranch(): BelongsTo
    {
        return $this->belongsTo(HospitalBranch::class, 'branch', 'key');
    }

    // ─── Access helpers ───────────────────────────────────────────────────────

    public function scopeForCurrentTenant(Builder $query): Builder
    {
        $tenantId = TenantContext::id();

        if ($tenantId !== null) {
            $query->where($this->getTable() . '.tenant_id', $tenantId);
        }

        return $query;
    }

    /**
     * True when the user holds an active, non-expired RBAC role whose slug
     * is 'system_admin' and that role has the 'system.admin' permission.
     *
     * This is the ONLY supported path for unrestricted system-level access.
     * Legacy role-string checks are intentionally NOT used here.
     */
    public function isSystemAdmin(): bool
    {
        return $this->hasPermission('system.admin');
    }

    /**
     * @deprecated  Use isSystemAdmin() or explicit RBAC permissions instead.
     *
     * Retained for backward-compatibility with legacy callers during migration.
     * Returns true only for the pure legacy case (no RBAC role assigned).
     * Once a user has an active RBAC role this always returns false so the
     * new permission system takes control.
     */
    public function isAdmin(): bool
    {
        // If the user has any active RBAC role, the legacy string check is bypassed.
        $hasRbacRole = $this->roles()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('user_roles.expires_at')
                    ->orWhereDate('user_roles.expires_at', '>=', now());
            })
            ->exists();

        if ($hasRbacRole) {
            // Let the RBAC layer handle everything — no legacy override.
            return false;
        }

        // Pure legacy fallback: user has no RBAC role, check the role string.
        $legacyAdminRoles = [
            'admin', 'administrator', 'super-admin', 'super_admin',
            'system_administrator', 'hospital_administrator',
            'branch_administrator', 'it_administrator',
        ];

        return in_array(strtolower((string) ($this->role ?? '')), $legacyAdminRoles, true);
    }

    public function isManager(): bool
    {
        return in_array($this->role, ['admin', 'manager']);
    }

    public function isLocked(): bool
    {
        return $this->locked_at !== null;
    }

    /**
     * True when the user has explicit global branch-access permission,
     * or is a legacy admin without a specific branch assignment.
     */
    public function hasGlobalBranchAccess(): bool
    {
        $perms = $this->getAllPermissions();

        // Must be explicitly granted 'branch.global_access' (not matched via wildcard)
        if (in_array('branch.global_access', $perms, true)) {
            return true;
        }

        // For backward-compatible legacy admin with no branch restrictions assigned:
        if ($this->branch === null && $this->userBranches()->count() === 0 && $this->isAdmin()) {
            return true;
        }

        return false;
    }

    /**
     * Whether the given branch(es) are accessible to this user.
     *
     * - Users with 'branch.global_access' permission → always true.
     * - Otherwise the branch must be in the user's assigned set.
     */
    public function canAccessBranch(string|array $branch): bool
    {
        // Explicit global-access permission required for unrestricted access.
        if ($this->hasGlobalBranchAccess()) {
            return true;
        }

        $branchesToCheck = is_array($branch)
            ? $branch
            : array_filter(array_map('trim', explode(',', $branch)));

        // Reject the literal "all" token — it must not bypass per-branch checks.
        if (in_array('all', $branchesToCheck, true)) {
            return false;
        }

        $allowedBranches = $this->branch_list;

        // User has no branch assignments at all → deny access (not unrestricted).
        if ($allowedBranches === []) {
            return false;
        }

        foreach ($branchesToCheck as $b) {
            if (!in_array($b, $allowedBranches, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * True when the user is limited to specific branches.
     * A user with global branch access is never restricted.
     */
    public function restrictsBranches(): bool
    {
        return !$this->hasGlobalBranchAccess();
    }

    public function getBranchListAttribute(): array
    {
        $branches = $this->userBranches->pluck('branch')->toArray();
        if ($this->branch && !in_array($this->branch, $branches)) {
            $branches[] = $this->branch;
        }
        return array_values(array_unique($branches));
    }

    public function getDepartmentListAttribute(): array
    {
        return $this->userDepartments->pluck('department')->toArray();
    }

    public function getStatusAttribute(): string
    {
        if ($this->locked_at) return 'locked';
        if (!$this->is_active) return 'inactive';
        return 'active';
    }
}
