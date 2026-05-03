<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_date',
        'receipt_no',
        'bill_no',
        'patient_id',
        'patient_name',
        'patient_type',
        'payment_mode',
        'paid_amount',
        'cashier_name',
        'raw_data',
    ];

    protected $casts = [
        'report_date' => 'date',
        'paid_amount' => 'decimal:2',
        'raw_data'    => 'array',
    ];

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('report_date', $date);
    }
}
