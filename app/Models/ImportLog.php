<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportLog extends Model
{
    protected $fillable = [
        'branch',
        'report_date',
        'uploaded_by',
        'files_uploaded',
        'rows_imported',
        'rows_skipped',
        'rows_errored',
        'status',
        'notes',
        'rolled_back_at',
        'rolled_back_by',
    ];

    protected $casts = [
        'files_uploaded' => 'array',
        'report_date'    => 'date',
        'rolled_back_at' => 'datetime',
    ];
}
