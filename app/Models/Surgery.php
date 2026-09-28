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
        'requested_surgeon',
        'scheduled_surgeon',
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
        'pac_status',
        'antibiotic_compliance',
        'surgical_indicators',
        'remarks',
        'surgery_start',
        'surgery_end',
        'ot_checkin',
        'ot_checkout',
        'surgery_tat',
        'ot_tat',
        'surgery_duration_min',
        'ot_duration_min',
        'surgery_booking_datetime',
        'expected_surgery_date',
        'discharge_date',
        'los',
        'icu_los',
        'non_icu_los',
        'blood_required',
        'blood_group',
    ];

    protected function casts(): array
    {
        return [
            'surgery_date'         => 'date',
            'surgery_start'        => 'datetime',
            'surgery_end'          => 'datetime',
            'ot_checkin'           => 'datetime',
            'ot_checkout'          => 'datetime',
            'implant_required'     => 'boolean',
            'pac_clearance'        => 'boolean',
            'blood_required'       => 'boolean',
            'los'                  => 'float',
            'icu_los'              => 'float',
            'non_icu_los'          => 'float',
            'surgery_duration_min' => 'integer',
            'ot_duration_min'      => 'integer',
        ];
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
    public function scopeForBranch(\Illuminate\Database\Eloquent\Builder $query, $branch): \Illuminate\Database\Eloquent\Builder
    {
        if ($branch === 'all' || (is_array($branch) && in_array('all', $branch, true))) {
            return $query;
        }
        if (is_array($branch)) return $query->whereIn('branch', $branch);
        $val = $branch instanceof \BackedEnum ? $branch->value : $branch;
        return $query->where('branch', $val);
    }

    public function scopeApplyFilters(\Illuminate\Database\Eloquent\Builder $query, array $filters): \Illuminate\Database\Eloquent\Builder
    {
        if (!empty($filters['departments']))         $query->whereIn('surgery_department', $filters['departments']);
        if (!empty($filters['sub_departments']))     $query->whereIn('surgery_sub_department', $filters['sub_departments']);
        if (!empty($filters['doctors']))             $query->whereIn('performing_surgeon', $filters['doctors']);
        if (!empty($filters['requested_surgeons']))  $query->whereIn('requested_surgeon', $filters['requested_surgeons']);
        if (!empty($filters['scheduled_surgeons']))  $query->whereIn('scheduled_surgeon', $filters['scheduled_surgeons']);
        if (!empty($filters['specialties']))         $query->whereIn('surgeon_speciality', $filters['specialties']);
        if (!empty($filters['ot_names']))            $query->whereIn('ot_name', $filters['ot_names']);
        if (!empty($filters['surgery_types']))       $query->whereIn('surgery_type', $filters['surgery_types']);
        if (!empty($filters['surgery_categories']))  $query->whereIn('surgery_category', $filters['surgery_categories']);
        if (!empty($filters['patient_types']))       $query->whereIn('patient_type', $filters['patient_types']);
        if (!empty($filters['genders']))             $query->whereIn('gender', $filters['genders']);
        if (!empty($filters['anaesthesia_types']))   $query->whereIn('anaesthesia_type', $filters['anaesthesia_types']);
        if (!empty($filters['payer_types']))         $query->whereIn('payer_type', $filters['payer_types']);
        if (!empty($filters['billing_categories']))  $query->whereIn('billing_category', $filters['billing_categories']);
        if (!empty($filters['statuses']))            $query->whereIn('status', $filters['statuses']);
        if (!empty($filters['pac_statuses']))        $query->whereIn('pac_status', $filters['pac_statuses']);
        if (isset($filters['blood_required']))       $query->where('blood_required', (bool)$filters['blood_required']);
        if (isset($filters['implant_required']))     $query->where('implant_required', (bool)$filters['implant_required']);
        if (!empty($filters['age_groups'])) {
            $query->where(function ($q) use ($filters) {
                foreach ($filters['age_groups'] as $group) {
                    if ($group === '0-18')  $q->orWhereBetween('age', [0, 18]);
                    elseif ($group === '19-40') $q->orWhereBetween('age', [19, 40]);
                    elseif ($group === '41-60') $q->orWhereBetween('age', [41, 60]);
                    elseif ($group === '61+')   $q->orWhere('age', '>=', 61);
                }
            });
        }
        return $query;
    }
}
