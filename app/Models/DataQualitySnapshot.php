<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class DataQualitySnapshot extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'branch',
        'from_date',
        'to_date',
        'counts',
        'scanned_at',
    ];

    protected function casts(): array
    {
        return [
            'from_date' => 'date',
            'to_date' => 'date',
            'counts' => 'array',
            'scanned_at' => 'datetime',
        ];
    }
}
