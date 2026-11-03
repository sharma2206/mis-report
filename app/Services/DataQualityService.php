<?php

namespace App\Services;

use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\DataQualitySnapshot;
use App\Models\IpAdmission;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class DataQualityService
{
    public function summary(array|string $branches, ?string $from, ?string $to): array
    {
        $bill = $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to);
        $cashier = $this->dated(CashierCollection::forBranch($branches), 'collection_date', $from, $to);
        $ip = $this->dated(IpAdmission::forBranch($branches), 'admission_date', $from, $to);

        return [
            'missing_bill_uhid' => (clone $bill)->where(fn ($q) => $q->whereNull('uhid')->orWhere('uhid', ''))->count(),
            'missing_visit_id' => (clone $bill)->where(fn ($q) => $q->whereNull('visit_id')->orWhere('visit_id', ''))->count(),
            'missing_bill_number' => (clone $bill)->where(fn ($q) => $q->whereNull('bill_no')->orWhere('bill_no', ''))->count(),
            'missing_bill_doctor' => (clone $bill)->where(fn ($q) => $q->whereNull('treating_doctor')->orWhere('treating_doctor', ''))->count(),
            'missing_bill_department' => (clone $bill)->where(fn ($q) => $q->whereNull('treating_department')->orWhere('treating_department', ''))->count(),
            'missing_bill_payer' => (clone $bill)->where(fn ($q) => $q->whereNull('payer_name')->orWhere('payer_name', ''))->count(),
            'missing_receipt_number' => (clone $cashier)->where(fn ($q) => $q->whereNull('receipt_no')->orWhere('receipt_no', ''))->count(),
            'missing_admission_number' => (clone $ip)->where(fn ($q) => $q->whereNull('admission_no')->orWhere('admission_no', ''))->count(),
            'missing_admission_uhid' => (clone $ip)->where(fn ($q) => $q->whereNull('uhid')->orWhere('uhid', ''))->count(),
            'duplicate_admission_number' => $this->duplicateGroupCount($ip, 'admission_no'),
        ];
    }

    public function issues(
        string $code,
        array|string $branches,
        ?string $from,
        ?string $to,
        int $perPage = 50
    ): LengthAwarePaginator {
        $queries = [
            'missing_bill_uhid' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('uhid')->orWhere('uhid', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'bill_no', 'visit_id']),
            'missing_visit_id' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('visit_id')->orWhere('visit_id', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'bill_no', 'uhid']),
            'missing_bill_number' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('bill_no')->orWhere('bill_no', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'visit_id', 'uhid']),
            'missing_bill_doctor' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('treating_doctor')->orWhere('treating_doctor', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'bill_no', 'visit_id', 'treating_department']),
            'missing_bill_department' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('treating_department')->orWhere('treating_department', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'bill_no', 'visit_id', 'treating_doctor']),
            'missing_bill_payer' => fn () => $this->dated(BillItem::forBranch($branches), 'bill_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('payer_name')->orWhere('payer_name', ''))
                ->select(['id', 'branch', 'bill_date as event_date', 'bill_no', 'visit_id', 'payer_type']),
            'missing_receipt_number' => fn () => $this->dated(CashierCollection::forBranch($branches), 'collection_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('receipt_no')->orWhere('receipt_no', ''))
                ->select(['id', 'branch', 'collection_date as event_date', 'visit_id', 'uhid', 'paid_amount']),
            'missing_admission_number' => fn () => $this->dated(IpAdmission::forBranch($branches), 'admission_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('admission_no')->orWhere('admission_no', ''))
                ->select(['id', 'branch', 'admission_date as event_date', 'uhid', 'treating_department']),
            'missing_admission_uhid' => fn () => $this->dated(IpAdmission::forBranch($branches), 'admission_date', $from, $to)
                ->where(fn ($q) => $q->whereNull('uhid')->orWhere('uhid', ''))
                ->select(['id', 'branch', 'admission_date as event_date', 'admission_no', 'treating_department']),
            'duplicate_admission_number' => fn () => $this->dated(IpAdmission::forBranch($branches), 'admission_date', $from, $to)
                ->whereNotNull('admission_no')
                ->where('admission_no', '!=', '')
                ->selectRaw('MIN(id) as id, branch, MIN(admission_date) as event_date, admission_no, COUNT(*) as occurrences')
                ->groupBy('branch', 'admission_no')
                ->havingRaw('COUNT(*) > 1'),
        ];

        abort_unless(isset($queries[$code]), 404, 'Unknown data-quality issue code.');

        return $queries[$code]()->orderByDesc('event_date')->paginate($perPage);
    }

    public function snapshot(array|string $branches, ?string $from, ?string $to): DataQualitySnapshot
    {
        $branch = is_array($branches) && count($branches) === 1 ? $branches[0] : null;

        return DataQualitySnapshot::create([
            'branch' => $branch,
            'from_date' => $from,
            'to_date' => $to,
            'counts' => $this->summary($branches, $from, $to),
            'scanned_at' => now(),
        ]);
    }

    private function dated(Builder $query, string $column, ?string $from, ?string $to): Builder
    {
        return $query
            ->when($from, fn (Builder $q) => $q->whereDate($column, '>=', $from))
            ->when($to, fn (Builder $q) => $q->whereDate($column, '<=', $to));
    }

    private function duplicateGroupCount(Builder $query, string $column): int
    {
        return (clone $query)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->select(['branch', $column])
            ->groupBy('branch', $column)
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->count();
    }
}
