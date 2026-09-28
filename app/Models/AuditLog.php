<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'event',
        'auditable_type',
        'auditable_id',
        'branch',
        'report_date',
        'payload',
        'ip_address',
        'user_agent',
    ];

    protected $casts = ['payload' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(
        string $event,
        array $payload = [],
        ?string $branch = null,
        ?string $date = null,
        ?Request $request = null
    ): self {
        return static::create([
            'user_id'      => Auth::id(),
            'event'        => $event,
            'branch'       => $branch,
            'report_date'  => $date,
            'payload'      => $payload,
            'ip_address'   => $request?->ip(),
            'user_agent'   => $request?->userAgent(),
        ]);
    }
}
