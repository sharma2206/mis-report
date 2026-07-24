<?php

namespace App\Models;

use App\Models\Traits\HasRoles;
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
        'name', 'email', 'password', 'role', 'branch', 'is_active',
        'employee_id', 'employee_code', 'mobile', 'designation', 'department',
        'speciality', 'reporting_manager_id', 'date_of_joining', 'employment_status',
        'failed_login_attempts', 'locked_at', 'last_login_at', 'last_logout_at',
        'password_changed_at', 'password_expires_at', 'mfa_enabled', 'mfa_secret', 'avatar',
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

    // ─── Access helpers ───────────────────────────────────────────────────────

    public function isAdmin(): bool   { return $this->role === 'admin'; }
    public function isManager(): bool { return in_array($this->role, ['admin', 'manager']); }
    public function isLocked(): bool  { return $this->locked_at !== null; }

    public function canAccessBranch(string|array $branch): bool
    {
        $branchesToCheck = is_array($branch) ? $branch : explode(',', $branch);

        // Null branch on user and 0 user_branches = unrestricted admin access
        if ($this->branch === null && $this->userBranches()->count() === 0) {
            return true;
        }

        // If user is restricted but requests "all", deny access
        // (Unless frontend logic handles "all" by passing specific branches, but if literal "all" reaches here)
        if (in_array('all', $branchesToCheck, true)) {
            return false;
        }

        $allowedBranches = $this->branch_list;

        foreach ($branchesToCheck as $b) {
            if (!in_array($b, $allowedBranches)) {
                return false;
            }
        }

        return true;
    }

    public function getBranchListAttribute(): array
    {
        $branches = $this->userBranches->pluck('branch')->toArray();
        if ($this->branch && ! in_array($this->branch, $branches)) {
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
        if (! $this->is_active) return 'inactive';
        return 'active';
    }
}
