<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class IpAdmission extends Model
{
    protected $fillable = [
        'branch', 'admission_date', 'admission_no', 'uhid', 'patient_name',
        'age', 'gender', 'admission_type', 'admission_source', 'status',
        'treating_doctor', 'treating_doctor_speciality', 'treating_department', 'treating_sub_department',
        'admitting_doctor', 'admitting_doctor_speciality', 'admitting_department',
        'ward', 'room', 'payer_type', 'payer_name', 'payer_group', 'billing_category',
        'high_risk', 'mlc', 'discharge_type', 'discharge_date', 'actual_los',
    ];

    protected function casts(): array
    {
        return [
            'admission_date' => 'date',
            'discharge_date' => 'datetime',
            'high_risk'      => 'boolean',
            'mlc'            => 'boolean',
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
