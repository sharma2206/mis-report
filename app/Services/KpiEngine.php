<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\KpiDefinition;
use InvalidArgumentException;

/**
 * Resolves a stored KPI definition by calling the existing DashboardKpiService.
 * Formulas stay in that service. This class only chooses which method to run.
 */
class KpiEngine
{
    public function __construct(private DashboardKpiService $kpis) {}

    public function evaluate(KpiDefinition $definition, Branch|string $branch, string $from, ?string $to = null, array $filters = []): int|float|null
    {
        $to ??= $from;

        return match ($definition->calculator) {
            'revenue'          => $this->kpis->calculateRevenue($branch, $from, $to, $filters),
            'pharmacy_revenue' => $this->kpis->calculatePharmacyRevenue($branch, $from, $to, $filters),
            'cash_collection'  => $this->kpis->calculateCashCollection($branch, $from, $to, $filters),
            'package_revenue'  => $this->kpis->calculatePackageRevenue($branch, $from, $to, $filters),
            'op_count'         => $this->kpis->calculateOpCount($branch, $from, $to, $filters),
            'ip_count'         => $this->kpis->calculateIpCount($branch, $from, $to, null, $filters),
            'admissions'       => $this->kpis->calculateAdmissions($branch, $from, $to),
            'discharges'       => $this->kpis->calculateDischarges($branch, $from, $to),
            'er_count'         => $this->kpis->calculateErCount($branch, $from, $to, null, $filters),
            'beds_occupied'    => $this->kpis->calculateBedsOccupied($branch, $to),
            'occupancy'        => $this->kpis->calculateOccupancy($branch, $to),
            default            => throw new InvalidArgumentException("Unknown KPI calculator [{$definition->calculator}]."),
        };
    }
}
