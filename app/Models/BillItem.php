<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class BillItem extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'branch', 'bill_date', 'bill_no', 'uhid', 'patient_id', 'patient_name',
        'age', 'gender', 'ward', 'bed', 'visit_id',
        'patient_type', 'payer_type', 'payer_name', 'payer_group', 'insurance_company', 'corporate_name',
        'service_type', 'sub_department', 'service_item_code', 'service_item_name',
        'treating_doctor', 'treating_doctor_speciality', 'treating_department', 'treating_sub_department',
        'billing_category', 'amount', 'discount_amount', 'net_amount', 'quantity', 'payment_mode', 'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bill_date'       => 'date',
            'amount'          => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'net_amount'      => 'decimal:2',
        ];
    }

    /**
     * Scope a query to only include records for a specific branch or array of branches.
     *
     * @param Builder $query
     * @param string|array|\BackedEnum $branch
     * @return Builder
     */
    public function scopeForBranch(Builder $query, $branch): Builder
    {
        if ($branch === 'all' || (is_array($branch) && in_array('all', $branch, true))) {
            return $query;
        }

        if (is_array($branch)) {
            return $query->whereIn('branch', $branch);
        }

        $val = $branch instanceof \BackedEnum ? $branch->value : $branch;
        return $query->where('branch', $val);
    }

    /**
     * Apply advanced dashboard filters.
     *
     * @param Builder $query
     * @param array $filters
     * @return Builder
     */
    public function scopeApplyFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['departments']))  $query->whereIn('treating_department', $filters['departments']);
        if (!empty($filters['doctors']))      $query->whereIn('treating_doctor', $filters['doctors']);
        if (!empty($filters['patient_types'])) $query->whereIn('patient_type', $filters['patient_types']);
        if (!empty($filters['genders']))      $query->whereIn('gender', $filters['genders']);
        if (!empty($filters['age_groups'])) {
            // Simplified age group mapping assuming age is stored as integer
            $query->where(function($q) use ($filters) {
                foreach($filters['age_groups'] as $group) {
                    if ($group === '0-18') $q->orWhereBetween('age', [0, 18]);
                    elseif ($group === '19-40') $q->orWhereBetween('age', [19, 40]);
                    elseif ($group === '41-60') $q->orWhereBetween('age', [41, 60]);
                    elseif ($group === '61+') $q->orWhere('age', '>=', 61);
                }
            });
        }
        if (!empty($filters['payment_types'])) $query->whereIn('payment_mode', $filters['payment_types']);
        if (!empty($filters['specialties']))   $query->whereIn('treating_doctor_speciality', $filters['specialties']);
        if (!empty($filters['wards']))         $query->whereIn('ward', $filters['wards']);
        if (!empty($filters['insurance']))     $query->whereIn('insurance_company', $filters['insurance']);
        if (!empty($filters['corporate']))     $query->whereIn('corporate_name', $filters['corporate']);
        
        return $query;
    }

    /**
     * Scope a query to only include records for a specific date.
     *
     * @param Builder $query
     * @param string $date
     * @return Builder
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('bill_date', $date);
    }

    /**
     * Scope a query to only include records for a specific month.
     *
     * @param Builder $query
     * @param string $date
     * @return Builder
     */
    public function scopeForMonth(Builder $query, string $date): Builder
    {
        $carbonDate = Carbon::parse($date);

        return $query->whereYear('bill_date', $carbonDate->year)
                     ->whereMonth('bill_date', $carbonDate->month);
    }

    /**
     * Scope: normal-sale rows only (KareXpert may export 'Active' instead of 'Sale').
     * Always use this instead of where('status', 'Sale') so both old and new imports match.
     */
    public function scopeSaleStatus(Builder $query): Builder
    {
        return $query->whereIn('status', ['Sale', 'Active']);
    }
}
