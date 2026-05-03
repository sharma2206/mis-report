<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_date',
        'bill_no',
        'patient_id',
        'patient_name',
        'patient_type',
        'service_type',
        'sub_department',
        'item_name',
        'quantity',
        'rate',
        'amount',
        'discount',
        'net_amount',
        'status',
        'doctor_name',
        'raw_data',
    ];

    protected $casts = [
        'report_date' => 'date',
        'quantity'    => 'decimal:2',
        'rate'        => 'decimal:2',
        'amount'      => 'decimal:2',
        'discount'    => 'decimal:2',
        'net_amount'  => 'decimal:2',
        'raw_data'    => 'array',
    ];

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('report_date', $date);
    }

    public function scopeOfPatientType($query, string $type)
    {
        return $query->where('patient_type', $type);
    }

    public function scopeOfServiceType($query, string $type)
    {
        return $query->where('service_type', $type);
    }
}
