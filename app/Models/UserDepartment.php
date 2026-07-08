<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDepartment extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'department'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
