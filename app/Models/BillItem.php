<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class BillItem extends Model
{
    use HasFactory;

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
     * Scope a query to only include records for a specific branch.
     *
     * @param Builder $query
     * @param string $branch
     * @return Builder
     */
    public function scopeForBranch(Builder $query, string $branch): Builder
    {
        return $query->where('branch', $branch);
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
