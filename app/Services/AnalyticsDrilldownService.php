<?php

namespace App\Services;

use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\IpAdmission;
use App\Models\Surgery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

class AnalyticsDrilldownService
{
    public function paginate(
        string $type,
        array|string $branches,
        string $from,
        string $to,
        array $filters,
        int $perPage = 25
    ): LengthAwarePaginator {
        $query = match ($type) {
            'bills' => BillItem::forBranch($branches)
                ->applyFilters($filters)
                ->saleStatus()
                ->whereBetween('bill_date', [$from, $to])
                ->select([
                    'id', 'branch', 'bill_date as event_date', 'bill_no', 'uhid', 'patient_name',
                    'visit_id', 'patient_type', 'treating_department', 'treating_doctor',
                    'service_type', 'service_item_name', 'payer_name', 'net_amount',
                ]),
            'admissions' => IpAdmission::forBranch($branches)
                ->applyFilters($filters)
                ->whereBetween('admission_date', [$from, $to])
                ->select([
                    'id', 'branch', 'admission_date as event_date', 'admission_no', 'uhid',
                    'patient_name', 'admission_type', 'treating_department', 'treating_doctor',
                    'ward', 'payer_name', 'discharge_date', 'actual_los',
                ]),
            'discharges' => IpAdmission::forBranch($branches)
                ->applyFilters($filters)
                ->whereBetween('discharge_date', [$from, $to])
                ->select([
                    'id', 'branch', 'discharge_date as event_date', 'admission_no', 'uhid',
                    'patient_name', 'discharge_type', 'treating_department', 'treating_doctor',
                    'ward', 'payer_name', 'admission_date', 'actual_los',
                ]),
            'collections' => CashierCollection::forBranch($branches)
                ->applyFilters($filters)
                ->whereBetween('collection_date', [$from, $to])
                ->select([
                    'id', 'branch', 'collection_date as event_date', 'receipt_no', 'uhid',
                    'patient_name', 'visit_id', 'patient_type', 'payment_mode', 'payer_name',
                    'transaction_category', 'paid_amount',
                ]),
            'surgeries' => Surgery::forBranch($branches)
                ->applyFilters($filters)
                ->whereBetween('surgery_date', [$from, $to])
                ->select([
                    'id', 'branch', 'surgery_date as event_date', 'admission_no', 'uhid',
                    'patient_name', 'surgery_name', 'surgery_category', 'surgery_department',
                    'performing_surgeon', 'ot_name', 'status',
                ]),
            default => throw new InvalidArgumentException("Unknown drill-down type [{$type}]."),
        };

        return $query
            ->orderByDesc('event_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();
    }
}
