<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ErAdmission extends Model
{
    protected $fillable = [
        'branch', 'admission_date', 'admission_no', 'uhid', 'patient_name',
        'age', 'gender', 'admission_type', 'status',
        'doctor_name', 'doctor_speciality', 'treating_department',
        'ward', 'bed', 'payer_type', 'payer_name', 'payer_group',
        'billing_category', 'high_risk', 'mlc', 'short_stay',
        'discharge_type', 'discharge_date', 'actual_los',
    ];

    protected function casts(): array
    {
        return [
            'admission_date' => 'date',
            'discharge_date' => 'datetime',
            'high_risk'      => 'boolean',
            'mlc'            => 'boolean',
            'short_stay'     => 'boolean',
            'actual_los'     => 'decimal:2',
        ];
    }

    public function scopeForBranch(Builder $query, string $branch): Builder
    {
        return $query->where('branch', $branch);
    }

    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('admission_date', $date);
    }

    public function scopeForMonth(Builder $query, string $date): Builder
    {
        $d = Carbon::parse($date);
        return $query->whereYear('admission_date', $d->year)
                     ->whereMonth('admission_date', $d->month);
    }
}
