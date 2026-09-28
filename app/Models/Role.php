<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'description', 'type', 'is_system', 'is_active',
        'color', 'icon', 'metadata', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
            'metadata'  => 'array',
        ];
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withPivot('granted_by', 'granted_at');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles')
            ->withPivot('assigned_by', 'assigned_at', 'expires_at');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(RoleBranch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getBranchListAttribute(): array
    {
        return $this->branches->pluck('branch')->toArray();
    }

    public function getUserCountAttribute(): int
    {
        return $this->users()->count();
    }

    public function getPermissionCountAttribute(): int
    {
        return $this->permissions()->count();
    }
}
