<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\MisReport;
use App\Models\PackageConsumption;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class MISService
{
    /**
     * Generate the MIS report.
     *
     * @param Branch $branch
     * @param string $date
     * @param array $volumeData
     * @return array
     */
    public function generateMIS(Branch $branch, string $date, array $volumeData = []): array
    {
        $data = [
            'branch' => $branch->label(),
            'branch_key' => $branch->value,
            'date' => $date,
            'sales' => $this->getSalesData($branch, $date),
            'collection' => $this->getCollectionData($branch, $date),
            'discount' => $this->getDiscountData($branch, $date),
            'refund' => $this->getRefundData($branch, $date),
            'mri' => $this->getMriData($branch, $date),
            'volume' => $this->buildVolumePayload($branch, $date, $volumeData),
            'generated_at' => now()->toDateTimeString(),
        ];

        $this->applyBranchAdjustments($branch, $data, $date);

        // Calculate totals for convenience
        $data['totals'] = $this->calculateTotals($data);

        // Persist the report snapshot
        $this->persistReport($branch, $date, $data, $volumeData);

        return $data;
    }

    /**
     * Get a summary for both branches on a given date (dashboard).
     *
     * @param string $date
     * @return array
     */
    public function getDashboardSummary(string $date): array
    {
        $summary = [];

        foreach (Branch::cases() as $branch) {
            $report = MisReport::where('branch', $branch->value)
                ->whereDate('report_date', $date)
                ->first();

            $summary[$branch->value] = [
                'branch' => $branch->label(),
                'branch_key' => $branch->value,
                'bed_count' => $branch->bedCount(),
                'has_data' => $report !== null,
                'report' => $report ? $report->report_data : null,
            ];
        }

        return $summary;
    }

    /**
     * Build the volume payload from manual inputs + accumulated MTD.
     *
     * @param Branch $branch
     * @param string $date
     * @param array $volumeData
     * @return array
     */
    public function buildVolumePayload(Branch $branch, string $date, array $volumeData): array
    {
        $ftd = [
            'occupancy' => $volumeData['ftd']['occupancy'] ?? 0,
            'occupancy_pct' => $volumeData['ftd']['occupancy_pct'] ?? 0,
            'admission' => $volumeData['ftd']['admission'] ?? 0,
            'discharge' => $volumeData['ftd']['discharge'] ?? 0,
            'total_op' => $volumeData['ftd']['total_op'] ?? 0,
        ];

        // Calculate MTD by accumulating from stored reports
        $mtd = $this->accumulateMtdVolume($branch, $date, $ftd);

        return [
            'ftd' => $ftd,
            'mtd' => $mtd,
        ];
    }

    /**
     * Accumulate MTD volume from stored daily reports.
     *
     * @param Branch $branch
     * @param string $date
     * @param array $todayFtd
     * @return array
     */
    private function accumulateMtdVolume(Branch $branch, string $date, array $todayFtd): array
    {
        $carbonDate = Carbon::parse($date);
        $monthStart = $carbonDate->copy()->startOfMonth()->toDateString();

        // Get all stored reports for this branch in the month BEFORE the current date
        $previousReports = MisReport::where('branch', $branch->value)
            ->whereDate('report_date', '>=', $monthStart)
            ->whereDate('report_date', '<', $date)
            ->get();

        $mtdOccupancy = $todayFtd['occupancy'];
        $mtdAdmission = $todayFtd['admission'];
        $mtdDischarge = $todayFtd['discharge'];
        $mtdTotalOp = $todayFtd['total_op'];
        $occupancyPctSum = $todayFtd['occupancy_pct'];
        $dayCount = 1;

        foreach ($previousReports as $report) {
            $mtdOccupancy += $report->occupancy;
            $mtdAdmission += $report->admission;
            $mtdDischarge += $report->discharge;
            $mtdTotalOp += $report->total_op;
            $occupancyPctSum += (float) $report->occupancy_pct;
            $dayCount++;
        }

        return [
            'occupancy' => $mtdOccupancy,
            'occupancy_pct' => $dayCount > 0 ? round($occupancyPctSum / $dayCount, 2) : 0,
            'admission' => $mtdAdmission,
            'discharge' => $mtdDischarge,
            'total_op' => $mtdTotalOp,
        ];
    }

    /**
     * Persist the report snapshot to the database.
     *
     * @param Branch $branch
     * @param string $date
     * @param array $data
     * @param array $volumeData
     * @return void
     */
    private function persistReport(Branch $branch, string $date, array $data, array $volumeData): void
    {
        MisReport::updateOrCreate(
            [
                'branch' => $branch->value,
                'report_date' => $date,
            ],
            [
                'occupancy' => $volumeData['ftd']['occupancy'] ?? 0,
                'occupancy_pct' => $volumeData['ftd']['occupancy_pct'] ?? 0,
                'admission' => $volumeData['ftd']['admission'] ?? 0,
                'discharge' => $volumeData['ftd']['discharge'] ?? 0,
                'total_op' => $volumeData['ftd']['total_op'] ?? 0,
                'report_data' => $data,
            ]
        );
    }

    /**
     * Calculate grand totals for FTD and MTD.
     *
     * @param array $data
     * @return array
     */
    private function calculateTotals(array $data): array
    {
        $sales = $data['sales'] ?? [];
        $col = $data['collection'] ?? [];

        $salesFtdTotal = array_sum($sales['ftd'] ?? []);
        $salesMtdTotal = array_sum($sales['mtd'] ?? []);
        $colFtdTotal = array_sum($col['ftd'] ?? []);
        $colMtdTotal = array_sum($col['mtd'] ?? []);

        return [
            'sales_ftd' => round($salesFtdTotal, 2),
            'sales_mtd' => round($salesMtdTotal, 2),
            'collection_ftd' => round($colFtdTotal, 2),
            'collection_mtd' => round($colMtdTotal, 2),
        ];
    }

    /**
     * Get Sales data using a single DB round-trip per period.
     *
     * @param Branch $branch
     * @param string $date
     * @return array
     */
    private function getSalesData(Branch $branch, string $date): array
    {
        $selectRaw = "
            SUM(CASE WHEN service_type = 'Pharmacy' AND patient_type IS NULL THEN net_amount ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as er_total
        ";

        $baseQuery = BillItem::query()->where('branch', $branch->value)->where('status', 'Active');

        $ftd = $this->buildPeriodQuery(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->buildPeriodQuery(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

        return [
            'ftd' => [
                'ph' => round($ftd->ph_total ?? 0, 2),
                'op' => round($ftd->op_total ?? 0, 2),
                'ip' => round($ftd->ip_total ?? 0, 2),
                'er' => round($ftd->er_total ?? 0, 2),
            ],
            'mtd' => [
                'ph' => round($mtd->ph_total ?? 0, 2),
                'op' => round($mtd->op_total ?? 0, 2),
                'ip' => round($mtd->ip_total ?? 0, 2),
                'er' => round($mtd->er_total ?? 0, 2),
            ],
        ];
    }

    /**
     * Get Collection data.
     *
     * @param Branch $branch
     * @param string $date
     * @return array
     */
    private function getCollectionData(Branch $branch, string $date): array
    {
        $selectRaw = "
            SUM(CASE WHEN patient_type IS NULL THEN paid_amount ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP' THEN paid_amount ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP' THEN paid_amount ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER' THEN paid_amount ELSE 0 END) as er_total
        ";

        $baseQuery = CashierCollection::query()->where('branch', $branch->value);

        $ftd = $this->buildPeriodQuery(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->buildPeriodQuery(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

        return [
            'ftd' => [
                'ph' => round($ftd->ph_total ?? 0, 2),
                'op' => round($ftd->op_total ?? 0, 2),
                'ip' => round($ftd->ip_total ?? 0, 2),
                'er' => round($ftd->er_total ?? 0, 2),
            ],
            'mtd' => [
                'ph' => round($mtd->ph_total ?? 0, 2),
                'op' => round($mtd->op_total ?? 0, 2),
                'ip' => round($mtd->ip_total ?? 0, 2),
                'er' => round($mtd->er_total ?? 0, 2),
            ],
        ];
    }

    /**
     * Get Discount data.
     *
     * @param Branch $branch
     * @param string $date
     * @return array
     */
    private function getDiscountData(Branch $branch, string $date): array
    {
        $selectRaw = "
            SUM(CASE WHEN service_type = 'Pharmacy' AND patient_type IS NULL AND net_amount != 0 THEN amount ELSE 0 END) as partial_ph,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN amount ELSE 0 END) as partial_op,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount != 0 THEN amount ELSE 0 END) as partial_ip,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount != 0 THEN amount ELSE 0 END) as partial_er,

            SUM(CASE WHEN service_type = 'Pharmacy' AND patient_type IS NULL AND net_amount = 0 THEN amount ELSE 0 END) as full_ph,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN amount ELSE 0 END) as full_op,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' AND net_amount = 0 THEN amount ELSE 0 END) as full_ip,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' AND net_amount = 0 THEN amount ELSE 0 END) as full_er
        ";

        // To only sum rows that actually have a discount, we check if amount > net_amount.
        $baseQuery = BillItem::query()->where('branch', $branch->value)
            ->where('status', 'Active')
            ->whereColumn('amount', '>', 'net_amount');

        $ftd = $this->buildPeriodQuery(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->buildPeriodQuery(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

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

    /**
     * Get Refund data.
     *
     * @param Branch $branch
     * @param string $date
     * @return array
     */
    private function getRefundData(Branch $branch, string $date): array
    {
        $selectRaw = "
            SUM(CASE WHEN service_type = 'Pharmacy' AND patient_type IS NULL THEN net_amount ELSE 0 END) as ph_total,
            SUM(CASE WHEN patient_type = 'OP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as op_total,
            SUM(CASE WHEN patient_type = 'IP' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as ip_total,
            SUM(CASE WHEN patient_type = 'ER' AND service_type != 'Pharmacy' THEN net_amount ELSE 0 END) as er_total
        ";

        $baseQuery = BillItem::query()->where('branch', $branch->value)->where('status', 'Refund');

        $ftd = $this->buildPeriodQuery(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->buildPeriodQuery(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

        return [
            'ftd' => [
                'ph' => round($ftd->ph_total ?? 0, 2),
                'op' => round($ftd->op_total ?? 0, 2),
                'ip' => round($ftd->ip_total ?? 0, 2),
                'er' => round($ftd->er_total ?? 0, 2),
            ],
            'mtd' => [
                'ph' => round($mtd->ph_total ?? 0, 2),
                'op' => round($mtd->op_total ?? 0, 2),
                'ip' => round($mtd->ip_total ?? 0, 2),
                'er' => round($mtd->er_total ?? 0, 2),
            ],
        ];
    }

    /**
     * Get MRI data.
     *
     * @param Branch $branch
     * @param string $date
     * @return array
     */
    private function getMriData(Branch $branch, string $date): array
    {
        $selectRaw = "
            SUM(CASE WHEN patient_type = 'OP' THEN quantity ELSE 0 END) as op_count,
            SUM(CASE WHEN patient_type = 'OP' THEN net_amount ELSE 0 END) as op_revenue,
            SUM(CASE WHEN patient_type = 'IP' THEN quantity ELSE 0 END) as ip_count,
            SUM(CASE WHEN patient_type = 'IP' THEN net_amount ELSE 0 END) as ip_revenue
        ";

        $baseQuery = BillItem::query()->where('branch', $branch->value)
            ->where('status', 'Active')
            ->where('sub_department', 'MRI');

        $ftd = $this->buildPeriodQuery(clone $baseQuery, $date, 'ftd')->selectRaw($selectRaw)->first();
        $mtd = $this->buildPeriodQuery(clone $baseQuery, $date, 'mtd')->selectRaw($selectRaw)->first();

        return [
            'ftd' => [
                'op' => [
                    'count' => (int) ($ftd->op_count ?? 0),
                    'revenue' => round($ftd->op_revenue ?? 0, 2),
                ],
                'ip' => [
                    'count' => (int) ($ftd->ip_count ?? 0),
                    'revenue' => round($ftd->ip_revenue ?? 0, 2),
                ],
            ],
            'mtd' => [
                'op' => [
                    'count' => (int) ($mtd->op_count ?? 0),
                    'revenue' => round($mtd->op_revenue ?? 0, 2),
                ],
                'ip' => [
                    'count' => (int) ($mtd->ip_count ?? 0),
                    'revenue' => round($mtd->ip_revenue ?? 0, 2),
                ],
            ],
        ];
    }

    /**
     * Apply branch specific adjustments for packages.
     *
     * @param Branch $branch
     * @param array &$data
     * @param string $date
     * @return void
     */
    private function applyBranchAdjustments(Branch $branch, array &$data, string $date): void
    {
        if ($branch === Branch::CHROMEPET) {
            $pkgFtd = (float) $this->buildPeriodQuery(
                PackageConsumption::query()->where('branch', $branch->value),
                $date,
                'ftd'
            )->sum('amount');

            $pkgMtd = (float) $this->buildPeriodQuery(
                PackageConsumption::query()->where('branch', $branch->value),
                $date,
                'mtd'
            )->sum('amount');

            $data['sales']['ftd']['ph'] += $pkgFtd;
            $data['sales']['ftd']['op'] -= $pkgFtd;
            $data['sales']['mtd']['ph'] += $pkgMtd;
            $data['sales']['mtd']['op'] -= $pkgMtd;

            // Ensure values remain correctly rounded after calculation
            $data['sales']['ftd']['ph'] = round($data['sales']['ftd']['ph'], 2);
            $data['sales']['ftd']['op'] = round($data['sales']['ftd']['op'], 2);
            $data['sales']['mtd']['ph'] = round($data['sales']['mtd']['ph'], 2);
            $data['sales']['mtd']['op'] = round($data['sales']['mtd']['op'], 2);

            $data['sales']['pkg_adjustment'] = [
                'ftd' => round($pkgFtd, 2),
                'mtd' => round($pkgMtd, 2),
            ];
        } else {
            $data['sales']['pkg_adjustment'] = [
                'ftd' => 0.00,
                'mtd' => 0.00,
            ];
        }
    }

    /**
     * Helper to add date or month/year constraints to query.
     *
     * @param Builder $q
     * @param string $date
     * @param string $period
     * @return Builder
     */
    private function buildPeriodQuery(Builder $q, string $date, string $period): Builder
    {
        $model = $q->getModel();
        $dateColumn = 'created_at';

        if ($model instanceof BillItem) {
            $dateColumn = 'bill_date';
        } elseif ($model instanceof CashierCollection) {
            $dateColumn = 'collection_date';
        } elseif ($model instanceof PackageConsumption) {
            $dateColumn = 'consumption_date';
        }

        if ($period === 'ftd') {
            return $q->whereDate($dateColumn, $date);
        }

        $carbonDate = Carbon::parse($date);
        $monthStart = $carbonDate->copy()->startOfMonth()->toDateString();

        return $q->whereDate($dateColumn, '>=', $monthStart)
            ->whereDate($dateColumn, '<=', $date);
    }
}
