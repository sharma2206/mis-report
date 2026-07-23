<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Surgery extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'branch',
        'surgery_date',
        'admission_no',
        'uhid',
        'patient_name',
        'age',
        'gender',
        'patient_type',
        'surgery_name',
        'surgery_code',
        'surgery_category',
        'surgery_type',
        'surgery_department',
        'surgery_sub_department',
        'ot_name',
        'ot_surgery_type',
        'performing_surgeon',
        'component_doctor',
        'surgeon_speciality',
        'surgeon_department',
        'anaesthesia_type',
        'payer_type',
        'payer_name',
        'payer_group',
        'billing_category',
        'status',
        'diagnosis_name',
        'implant_required',
        'surgery_contamination',
        'pac_clearance',
        'surgery_start',
        'surgery_end',
        'ot_checkin',
        'ot_checkout',
        'surgery_tat',
        'ot_tat',
    ];

    protected function casts(): array
    {
        return [
            'surgery_date'    => 'date',
            'surgery_start'   => 'datetime',
            'surgery_end'     => 'datetime',
            'ot_checkin'      => 'datetime',
            'ot_checkout'     => 'datetime',
            'implant_required' => 'boolean',
            'pac_clearance'   => 'boolean',
        ];
    }

    public function scopeForBranch(Builder $query, string $branch): Builder
    {
        return $query->where('branch', $branch);
    }

    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('surgery_date', $date);
    }

    public function scopeForMonth(Builder $query, string $date): Builder
    {
        $d = Carbon::parse($date);
        return $query->whereYear('surgery_date', $d->year)
            ->whereMonth('surgery_date', $d->month);
    }
}
