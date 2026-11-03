<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Database branch. The App\Enums\Branch enum remains the route-level
 * compatibility layer for the original Chromepet and Oragadam keys.
 */
class HospitalBranch extends Model
{
    use BelongsToTenant;

    protected $table = 'branches';

    protected $fillable = [
        'tenant_id',
        'hospital_id',
        'key',
        'name',
        'bed_count',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'bed_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
