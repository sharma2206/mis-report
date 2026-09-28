<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'event', 'ip_address', 'user_agent', 'browser', 'location', 'meta'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(int $userId, string $event, array $meta = [], ?string $ip = null, ?string $ua = null): void
    {
        static::create([
            'user_id'    => $userId,
            'event'      => $event,
            'ip_address' => $ip,
            'user_agent' => $ua,
            'browser'    => $ua ? static::parseBrowser($ua) : null,
            'meta'       => $meta ?: null,
        ]);
    }

    private static function parseBrowser(string $ua): string
    {
        if (str_contains($ua, 'Chrome'))  return 'Chrome';
        if (str_contains($ua, 'Firefox')) return 'Firefox';
        if (str_contains($ua, 'Safari'))  return 'Safari';
        if (str_contains($ua, 'Edge'))    return 'Edge';
        return 'Unknown';
    }
}
