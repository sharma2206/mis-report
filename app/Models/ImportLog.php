<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ImportLog extends Model
{
    use SoftDeletes;
    protected $fillable = [
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
}
