<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SourceCapability extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'source_key',
        'adapter',
        'status',
        'last_synced_at',
        'capabilities',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
            'capabilities' => 'array',
            'metadata' => 'array',
        ];
    }
}
