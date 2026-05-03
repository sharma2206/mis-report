<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PackageConsumption extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_date',
        'package_name',
        'patient_id',
        'patient_name',
        'patient_type',
        'service_type',
        'item_name',
        'quantity',
        'rate',
        'value',
        'raw_data',
    ];

    protected $casts = [
        'report_date' => 'date',
        'quantity'    => 'decimal:2',
        'rate'        => 'decimal:2',
        'value'       => 'decimal:2',
        'raw_data'    => 'array',
    ];

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('report_date', $date);
    }
}
