<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\MisReport;
use App\Repositories\Contracts\MisRepositoryInterface;
use Carbon\Carbon;

class MISService
{
    public function __construct(private MisRepositoryInterface $repo) {}

    public function generateMIS(Branch $branch, string $date, array $volumeData = []): array
    {
        if (empty($volumeData)) {
            $existing = MisReport::where('branch', $branch->value)->where('report_date', $date)->first();
            if ($existing) {
                $volumeData = [
                    'ftd' => [
                        'occupancy'     => $existing->occupancy,
                        'occupancy_pct' => (float) $existing->occupancy_pct,
                        'admission'     => $existing->admission,
                        'discharge'     => $existing->discharge,
                        'total_op'      => $existing->total_op,
                        'er_count'      => $existing->er_count ?? 0,
                    ]
                ];
            }
        }

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
            'occupancy'     => round($volumeData['ftd']['occupancy']     ?? 0, 0),
            'occupancy_pct' => round($volumeData['ftd']['occupancy_pct'] ?? 0, 0),
            'admission'     => $volumeData['ftd']['admission'] ?? 0,
            'discharge'     => $volumeData['ftd']['discharge'] ?? 0,
            'total_op'      => $volRaw['ftd_op'],
            'er_count'      => $volumeData['ftd']['er_count'] ?? 0,
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

        $this->persistReport($branch, $date, $volumeData);

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

    private function buildMtdVolume(Branch $branch, string $date, array $todayFtd, int $mtdOp): array
    {
        $prev = $this->repo->getPreviousMtdReports($branch, $date);

        $occ    = $todayFtd['occupancy'];
        $adm    = $todayFtd['admission'];
        $dis    = $todayFtd['discharge'];
        $er     = $todayFtd['er_count'];
        $pctSum = $todayFtd['occupancy_pct'];
        $days   = 1;

        foreach ($prev as $r) {
            $occ    += $r->occupancy;
            $adm    += $r->admission;
            $dis    += $r->discharge;
            $er     += ($r->er_count ?? 0);
            $pctSum += (float) $r->occupancy_pct;
            $days++;
        }

        return [
            'occupancy'     => round($occ, 0),
            'occupancy_pct' => $days > 0 ? round($pctSum / $days, 0) : 0,
            'admission'     => $adm,
            'discharge'     => $dis,
            'er_count'      => $er,
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

    private function persistReport(Branch $branch, string $date, array $volumeData): void
    {
        MisReport::updateOrCreate(
            ['branch' => $branch->value, 'report_date' => $date],
            [
                'occupancy'     => $volumeData['ftd']['occupancy']     ?? 0,
                'occupancy_pct' => $volumeData['ftd']['occupancy_pct'] ?? 0,
                'admission'     => $volumeData['ftd']['admission']     ?? 0,
                'discharge'     => $volumeData['ftd']['discharge']     ?? 0,
                'total_op'      => $volumeData['ftd']['total_op']      ?? 0,
                'er_count'      => $volumeData['ftd']['er_count']      ?? 0,
            ]
        );
    }
}
