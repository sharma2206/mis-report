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
        if (!empty($filters['departments']))  $query->whereIn('surgery_department', $filters['departments']);
        if (!empty($filters['doctors']))      $query->whereIn('performing_surgeon', $filters['doctors']);
        if (!empty($filters['genders']))      $query->whereIn('gender', $filters['genders']);
        if (!empty($filters['age_groups'])) {
            $query->where(function($q) use ($filters) {
                foreach($filters['age_groups'] as $group) {
                    if ($group === '0-18') $q->orWhereBetween('age', [0, 18]);
                    elseif ($group === '19-40') $q->orWhereBetween('age', [19, 40]);
                    elseif ($group === '41-60') $q->orWhereBetween('age', [41, 60]);
                    elseif ($group === '61+') $q->orWhere('age', '>=', 61);
                }
            });
        }
        if (!empty($filters['specialties']))  $query->whereIn('surgeon_speciality', $filters['specialties']);
        if (!empty($filters['corporate']))    $query->whereIn('corporate_name', $filters['corporate']);
        if (!empty($filters['insurance']))    $query->whereIn('insurance_company', $filters['insurance']);
        return $query;
    }
}
