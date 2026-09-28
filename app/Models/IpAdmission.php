<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IpAdmission extends Model
{
    use SoftDeletes;
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

    public function scopeForBranch(Builder $query, $branch): Builder
    {
        if ($branch === 'all' || (is_array($branch) && in_array('all', $branch, true))) {
            return $query;
        }
        if (is_array($branch)) return $query->whereIn('branch', $branch);
        $val = $branch instanceof \BackedEnum ? $branch->value : $branch;
        return $query->where('branch', $val);
    }

    public function scopeApplyFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['departments']))  $query->whereIn('treating_department', $filters['departments']);
        if (!empty($filters['doctors']))      $query->whereIn('treating_doctor', $filters['doctors']);
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
        if (!empty($filters['specialties']))   $query->whereIn('treating_doctor_speciality', $filters['specialties']);
        if (!empty($filters['wards']))         $query->whereIn('ward', $filters['wards']);
        
        return $query;
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
