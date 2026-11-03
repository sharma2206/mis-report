<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportLog extends Model
{
    use SoftDeletes, BelongsToTenant;
    protected $fillable = [
        'tenant_id',
        'branch',
        'report_type',
        'report_date',
        'uploaded_by',
        'user_id',
        'files_uploaded',
        'rows_imported',
        'rows_skipped',
        'rows_errored',
        'period_from',
        'period_to',
        'duration_ms',
        'status',
        'notes',          // JSON: file_name, rows_read, rows_deleted, rows_inserted, error
        'rolled_back_at',
        'rolled_back_by',
    ];

    protected $casts = [
        'files_uploaded' => 'array',
        'report_date'    => 'date',
        'period_from'    => 'date',
        'period_to'      => 'date',
        'rolled_back_at' => 'datetime',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class)->withDefault();
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function hospitalBranch(): BelongsTo
    {
        return $this->belongsTo(HospitalBranch::class, 'branch', 'key');
    }
}
