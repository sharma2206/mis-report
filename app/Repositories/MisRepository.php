<?php

namespace App\Repositories;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\MisReport;
use App\Models\PackageConsumption;
use App\Repositories\Contracts\MisRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

class MisRepository implements MisRepositoryInterface
{
    public function getSalesData(Branch $branch, string $date): array
    {
        $sql = "
            SUM(CASE WHEN service_type = 'Pharmacy' THEN net_amount ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as er_total
        ";
        $base = BillItem::where('branch', $branch->value)->whereIn('status', ['Sale', 'Refund']);
        $ftd  = $this->period(clone $base, $date, 'ftd')->selectRaw($sql)->first();
        $mtd  = $this->period(clone $base, $date, 'mtd')->selectRaw($sql)->first();

        return [
            'ftd' => $this->fourKey($ftd),
            'mtd' => $this->fourKey($mtd),
        ];
    }

    public function getCollectionData(Branch $branch, string $date): array
    {
        $sql = "
            SUM(CASE WHEN patient_type IS NULL THEN COALESCE(NULLIF(paid_amount, 0), 0) ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP'  THEN COALESCE(NULLIF(paid_amount, 0), 0) ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP'  THEN COALESCE(NULLIF(paid_amount, 0), 0) ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER'  THEN COALESCE(NULLIF(paid_amount, 0), 0) ELSE 0 END) as er_total
        ";
        $base = CashierCollection::where('branch', $branch->value);
        $ftd  = $this->period(clone $base, $date, 'ftd')->selectRaw($sql)->first();
        $mtd  = $this->period(clone $base, $date, 'mtd')->selectRaw($sql)->first();

        return [
            'ftd' => $this->fourKey($ftd),
            'mtd' => $this->fourKey($mtd),
        ];
    }

    // public function getDiscountData(Branch $branch, string $date): array
    // {
    //     // Discount 99% (partial) uses net_amount
    //     // Discount 100% (full)   uses amount
    //     $sql = "
    //         SUM(CASE WHEN service_type = 'Pharmacy' AND net_amount != 0 THEN COALESCE(net_amount, 0) ELSE 0 END) as partial_ph,
    //         SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(net_amount, 0) ELSE 0 END) as partial_op,
    //         SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(net_amount, 0) ELSE 0 END) as partial_ip,
    //         SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(net_amount, 0) ELSE 0 END) as partial_er,
    //         SUM(CASE WHEN service_type = 'Pharmacy' AND net_amount = 0 THEN COALESCE(amount, 0) ELSE 0 END) as full_ph,
    //         SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(amount, 0) ELSE 0 END) as full_op,
    //         SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(amount, 0) ELSE 0 END) as full_ip,
    //         SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(amount, 0) ELSE 0 END) as full_er
    //     ";
    //     $base = BillItem::where('branch', $branch->value)->whereIn('status', ['Sale', 'Active', 'Refund']);
    //     $ftd  = $this->period(clone $base, $date, 'ftd')->selectRaw($sql)->first();
    //     $mtd  = $this->period(clone $base, $date, 'mtd')->selectRaw($sql)->first();

    //     return [
    //         'ftd' => [
    //             'partial' => ['ph' => round($ftd->partial_ph ?? 0, 2), 'op' => round($ftd->partial_op ?? 0, 2), 'ip' => round($ftd->partial_ip ?? 0, 2), 'er' => round($ftd->partial_er ?? 0, 2)],
    //             'full'    => ['ph' => round($ftd->full_ph    ?? 0, 2), 'op' => round($ftd->full_op    ?? 0, 2), 'ip' => round($ftd->full_ip    ?? 0, 2), 'er' => round($ftd->full_er    ?? 0, 2)],
    //         ],
    //         'mtd' => [
    //             'partial' => ['ph' => round($mtd->partial_ph ?? 0, 2), 'op' => round($mtd->partial_op ?? 0, 2), 'ip' => round($mtd->partial_ip ?? 0, 2), 'er' => round($mtd->partial_er ?? 0, 2)],
    //             'full'    => ['ph' => round($mtd->full_ph    ?? 0, 2), 'op' => round($mtd->full_op    ?? 0, 2), 'ip' => round($mtd->full_ip    ?? 0, 2), 'er' => round($mtd->full_er    ?? 0, 2)],
    //         ],
    //     ];
    // }
    public function getDiscountData(Branch $branch, string $date): array
    {
        $selectRaw = "
         SUM(CASE WHEN service_type = 'Pharmacy' AND net_amount != 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as partial_ph,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as partial_op,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as partial_ip,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount != 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as partial_er,

            SUM(CASE WHEN service_type = 'Pharmacy' AND net_amount = 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as full_ph,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as full_op,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as full_ip,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount = 0 THEN COALESCE(NULLIF(amount, 0), 0) ELSE 0 END) as full_er
            ";

        // Discount 99% (partial) includes BOTH Sale and Refund where net_amount != 0
        // Discount 100% (full) includes Sale where net_amount == 0
        $baseQuery = BillItem::query()->where('branch', $branch->value)->whereIn('status', ['Sale', 'Refund']);

        $ftd = $this->period(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->period(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

        return [
            'ftd' => [
                'partial' => [
                    'ph' => round($ftd->partial_ph ?? 0, 2),
                    'op' => round($ftd->partial_op ?? 0, 2),
                    'ip' => round($ftd->partial_ip ?? 0, 2),
                    'er' => round($ftd->partial_er ?? 0, 2),
                ],
                'full' => [
                    'ph' => round($ftd->full_ph ?? 0, 2),
                    'op' => round($ftd->full_op ?? 0, 2),
                    'ip' => round($ftd->full_ip ?? 0, 2),
                    'er' => round($ftd->full_er ?? 0, 2),
                ],
            ],
            'mtd' => [
                'partial' => [
                    'ph' => round($mtd->partial_ph ?? 0, 2),
                    'op' => round($mtd->partial_op ?? 0, 2),
                    'ip' => round($mtd->partial_ip ?? 0, 2),
                    'er' => round($mtd->partial_er ?? 0, 2),
                ],
                'full' => [
                    'ph' => round($mtd->full_ph ?? 0, 2),
                    'op' => round($mtd->full_op ?? 0, 2),
                    'ip' => round($mtd->full_ip ?? 0, 2),
                    'er' => round($mtd->full_er ?? 0, 2),
                ],
            ],
        ];
    }
    public function getRefundData(Branch $branch, string $date): array
    {
        $sql = "
            SUM(CASE WHEN service_type = 'Pharmacy' THEN COALESCE(NULLIF(ABS(net_amount), 0), 0) ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' THEN COALESCE(NULLIF(ABS(net_amount), 0), 0) ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' THEN COALESCE(NULLIF(ABS(net_amount), 0), 0) ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' THEN COALESCE(NULLIF(ABS(net_amount), 0), 0) ELSE 0 END) as er_total
        ";
        $base = BillItem::where('branch', $branch->value)->where('status', 'Refund');
        $ftd  = $this->period(clone $base, $date, 'ftd')->selectRaw($sql)->first();
        $mtd  = $this->period(clone $base, $date, 'mtd')->selectRaw($sql)->first();

        return [
            'ftd' => $this->fourKey($ftd),
            'mtd' => $this->fourKey($mtd),
        ];
    }

    public function getMriData(Branch $branch, string $date): array
    {
        if ($branch === Branch::ORAGADAM) {
            $empty = ['op' => ['count' => 0, 'revenue' => 0.0], 'ip' => ['count' => 0, 'revenue' => 0.0]];
            return ['ftd' => $empty, 'mtd' => $empty];
        }

        $sql = "
            SUM(CASE WHEN patient_type = 'OP' THEN quantity   ELSE 0 END) as op_count,
            SUM(CASE WHEN patient_type = 'OP' THEN net_amount ELSE 0 END) as op_revenue,
            SUM(CASE WHEN patient_type = 'IP' THEN quantity   ELSE 0 END) as ip_count,
            SUM(CASE WHEN patient_type = 'IP' THEN net_amount ELSE 0 END) as ip_revenue,
            SUM(CASE WHEN patient_type = 'ER' THEN quantity   ELSE 0 END) as er_count,
            SUM(CASE WHEN patient_type = 'ER' THEN net_amount ELSE 0 END) as er_revenue
        ";
        $base = BillItem::where('branch', $branch->value)->where('sub_department', 'MRI');
        $ftd  = $this->period(clone $base, $date, 'ftd')->selectRaw($sql)->first();
        $mtd  = $this->period(clone $base, $date, 'mtd')->selectRaw($sql)->first();

        return [
            'ftd' => [
                'op' => ['count' => (int)($ftd->op_count  ?? 0), 'revenue' => round($ftd->op_revenue  ?? 0, 2)],
                'ip' => ['count' => (int)($ftd->ip_count  ?? 0) + (int)($ftd->er_count ?? 0), 'revenue' => round(($ftd->ip_revenue ?? 0) + ($ftd->er_revenue ?? 0), 2)],
            ],
            'mtd' => [
                'op' => ['count' => (int)($mtd->op_count  ?? 0), 'revenue' => round($mtd->op_revenue  ?? 0, 2)],
                'ip' => ['count' => (int)($mtd->ip_count  ?? 0) + (int)($mtd->er_count ?? 0), 'revenue' => round(($mtd->ip_revenue ?? 0) + ($mtd->er_revenue ?? 0), 2)],
            ],
        ];
    }

    public function getPackageAdjustment(Branch $branch, string $date): array
    {
        if ($branch !== Branch::CHROMEPET) {
            return ['ftd' => 0.0, 'mtd' => 0.0];
        }

        $base = PackageConsumption::where('branch', $branch->value);
        return [
            'ftd' => round((float) $this->period(clone $base, $date, 'ftd')->sum('amount'), 2),
            'mtd' => round((float) $this->period(clone $base, $date, 'mtd')->sum('amount'), 2),
        ];
    }

    public function getVolumeData(Branch $branch, string $date): array
    {
        // Count distinct UHID (patient visits) from OP bill rows — avoids dependency on
        // the exact service_type label KareXpert exports for consultations.
        $opBase = BillItem::query()
            ->where('branch', $branch->value)
            ->where('patient_type', 'OP')
            ->where('service_type', 'OP Consultation');

        return [
            'ftd_op' => (int) $this->period(clone $opBase, $date, 'ftd')->sum('quantity'),
            'mtd_op' => (int) $this->period(clone $opBase, $date, 'mtd')->sum('quantity'),
        ];
    }

    public function getPreviousMtdReports(Branch $branch, string $date): \Illuminate\Database\Eloquent\Collection
    {
        $monthStart = Carbon::parse($date)->startOfMonth()->toDateString();
        return MisReport::where('branch', $branch->value)
            ->whereDate('report_date', '>=', $monthStart)
            ->whereDate('report_date', '<', $date)
            ->get();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    protected function period(Builder $q, string $date, string $period): Builder
    {
        $col = match (get_class($q->getModel())) {
            BillItem::class             => 'bill_date',
            CashierCollection::class    => 'collection_date',
            PackageConsumption::class   => 'consumption_date',
            default                     => 'created_at',
        };

        if ($period === 'ftd') {
            return $q->whereDate($col, $date);
        }

        $start = Carbon::parse($date)->startOfMonth()->toDateString();
        return $q->whereDate($col, '>=', $start)->whereDate($col, '<=', $date);
    }

    private function fourKey($row): array
    {
        return [
            'ph' => round($row->ph_total ?? 0, 2),
            'op' => round($row->op_total ?? 0, 2),
            'ip' => round($row->ip_total ?? 0, 2),
            'er' => round($row->er_total ?? 0, 2),
        ];
    }
}
