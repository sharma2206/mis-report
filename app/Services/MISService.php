<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\MisReport;
use App\Models\Surgery;
use App\Repositories\Contracts\MisRepositoryInterface;
use Carbon\Carbon;

class MISService
{
    public function __construct(private MisRepositoryInterface $repo, private DashboardKpiService $kpi) {}

    /**
     * Build the full MIS report for a branch+date. Every KPI is calculated fresh
     * from the reporting database via DashboardKpiService — nothing here accepts
     * a manually entered value.
     *
     * @param array|null $sources  Which optional CSV files were part of *this* upload
     *                             (only passed by the upload flow). When null (e.g. a
     *                             plain dashboard GET), previously persisted sources
     *                             for this branch+date are used unchanged.
     */
    public function generateMIS(Branch $branch, string $date, ?array $sources = null): array
    {
        $pkgAdj = $this->repo->getPackageAdjustment($branch, $date);
        $sales  = $this->repo->getSalesData($branch, $date);

        // Apply Chromepet package adjustment (PH += pkg, IP -= pkg)
        if ($branch === Branch::CHROMEPET) {
            foreach (['ftd', 'mtd'] as $p) {
                $sales[$p]['ph'] = round($sales[$p]['ph'] + $pkgAdj[$p], 2);
                $sales[$p]['ip'] = round($sales[$p]['ip'] - $pkgAdj[$p], 2);
            }
        }

        $volRaw = $this->repo->getVolumeData($branch, $date);

        $ftd = [
            'occupancy'     => $this->kpi->calculateBedsOccupied($branch, $date, $sources),
            'occupancy_pct' => $this->kpi->calculateOccupancy($branch, $date, $sources),
            'admission'     => $this->kpi->calculateAdmissions($branch, $date, null, $sources),
            'discharge'     => $this->kpi->calculateDischarges($branch, $date, null, $sources),
            'total_op'      => $volRaw['ftd_op'],
            'er_count'      => $this->kpi->calculateErCount($branch, $date, null, $sources),
            'surgery_count' => Surgery::where('branch', $branch->value)->whereDate('surgery_date', $date)->count(),
        ];
        $mtd = $this->buildMtdVolume($branch, $date, $ftd, $volRaw['mtd_op']);

        $data = [
            'branch'         => $branch->label(),
            'branch_key'     => $branch->value,
            'date'           => $date,
            'sales'          => $sales,
            'collection'     => $this->repo->getCollectionData($branch, $date),
            'discount'       => $this->repo->getDiscountData($branch, $date),
            'refund'         => $this->repo->getRefundData($branch, $date),
            'mri'            => $this->repo->getMriData($branch, $date),
            'pkg_adjustment' => $pkgAdj,
            'volume'         => ['ftd' => $ftd, 'mtd' => $mtd],
            'generated_at'   => now()->toDateTimeString(),
        ];

        $data['totals'] = $this->calculateTotals($data);

        $this->persistVolume($branch, $date, $ftd, $sources);

        return $data;
    }

    public function getDashboardSummary(string $date): array
    {
        $summary = [];
        foreach (Branch::cases() as $branch) {
            $report = MisReport::where('branch', $branch->value)->whereDate('report_date', $date)->first();
            $summary[$branch->value] = [
                'branch'     => $branch->label(),
                'branch_key' => $branch->value,
                'bed_count'  => $branch->bedCount(),
                'has_data'   => $report !== null,
                'report'     => $report?->report_data,
            ];
        }
        return $summary;
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Build MTD volume by querying the source tables directly for the full month range.
     * This ensures that uploading a multi-day CSV on a single date still produces
     * accurate MTD totals without relying on per-day snapshot accumulation.
     *
     * Occupancy is derived from ip_admissions (patient-days / days) so bulk imports
     * produce correct MTD census without requiring daily mis_reports snapshots.
     */
    private function buildMtdVolume(Branch $branch, string $date, array $todayFtd, int $mtdOp): array
    {
        $from = Carbon::parse($date)->startOfMonth()->toDateString();

        // Admission = patients whose admission_date falls in the MTD window
        $admission = IpAdmission::where('branch', $branch->value)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $date)
            ->count();

        // Discharge = patients whose discharge_date falls in the MTD window
        $discharge = IpAdmission::where('branch', $branch->value)
            ->whereDate('discharge_date', '>=', $from)
            ->whereDate('discharge_date', '<=', $date)
            ->count();

        // ER count = ER admissions in the MTD window
        $erCount = ErAdmission::where('branch', $branch->value)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $date)
            ->count();

        // Surgery count = surgeries in the MTD window
        $surgeryCount = Surgery::where('branch', $branch->value)
            ->whereDate('surgery_date', '>=', $from)
            ->whereDate('surgery_date', '<=', $date)
            ->count();

        // Occupancy (census) — calculated directly from ip_admissions.
        // Sum the overlap of each patient's stay with the MTD window, divided by
        // the number of days, gives the average daily bed census.
        // This works correctly for bulk imports where no mis_reports snapshots exist.
        $bedCount    = $branch->bedCount();
        $days        = Carbon::parse($from)->diffInDays(Carbon::parse($date)) + 1;
        // Use period_end + 1 day as the exclusive upper bound so that:
        //   - admitted but not discharged → counted through the last day of period
        //   - discharged patients         → discharge day itself is NOT counted
        // This matches the standard hospital patient-days convention.
        $periodNext  = Carbon::parse($date)->addDay()->toDateString();

        $patientDays = IpAdmission::where('branch', $branch->value)
            ->whereDate('admission_date', '<=', $date)
            ->where(function ($q) use ($from) {
                $q->whereNull('discharge_date')
                  ->orWhereDate('discharge_date', '>', $from);
            })
            ->selectRaw('
                SUM(
                    DATEDIFF(
                        LEAST(COALESCE(DATE(discharge_date), ?), ?),
                        GREATEST(DATE(admission_date), ?)
                    )
                ) as total_days
            ', [$periodNext, $periodNext, $from])
            ->value('total_days') ?? 0;

        $avgCensus  = $days > 0 ? round($patientDays / $days, 0) : 0;
        $avgOccPct  = ($bedCount > 0 && $days > 0) ? round(($patientDays / $days / $bedCount) * 100, 1) : 0;

        return [
            'occupancy'     => $avgCensus,
            'occupancy_pct' => $avgOccPct,
            'admission'     => $admission,
            'discharge'     => $discharge,
            'er_count'      => $erCount,
            'surgery_count' => $surgeryCount,
            'total_op'      => $mtdOp,
        ];
    }

    private function calculateTotals(array $data): array
    {
        $s = $data['sales']      ?? [];
        $c = $data['collection'] ?? [];
        return [
            'sales_ftd'      => round(array_sum($s['ftd'] ?? []), 2),
            'sales_mtd'      => round(array_sum($s['mtd'] ?? []), 2),
            'collection_ftd' => round(array_sum($c['ftd'] ?? []), 2),
            'collection_mtd' => round(array_sum($c['mtd'] ?? []), 2),
        ];
    }

    private function persistVolume(Branch $branch, string $date, array $ftd, ?array $sources = null): void
    {
        $values = [
            'occupancy'     => $ftd['occupancy']     ?? 0,
            'occupancy_pct' => $ftd['occupancy_pct'] ?? 0,
            'admission'     => $ftd['admission']     ?? 0,
            'discharge'     => $ftd['discharge']     ?? 0,
            'total_op'      => $ftd['total_op']      ?? 0,
            'er_count'      => $ftd['er_count']      ?? 0,
            'surgery_count' => $ftd['surgery_count'] ?? 0,
        ];

        if ($sources !== null) {
            $values['sources'] = $sources;
        }

        MisReport::updateOrCreate(['branch' => $branch->value, 'report_date' => $date], $values);
    }
}
