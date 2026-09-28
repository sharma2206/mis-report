<?php

namespace App\Services;

use App\Enums\Branch;
use App\Repositories\OperationalRepository;

class OperationalService
{
    public function __construct(private OperationalRepository $repo) {}

    // ─── KPIs + Bed Summary ──────────────────────────────────────────────────

    public function getKpis(string $branch, string $date): array
    {
        $branchEnum = Branch::from($branch);
        $bedCount   = $branchEnum->bedCount();
        $data       = $this->repo->getKpis($branch, $date);

        $pct = $bedCount > 0 ? round(($data['current_ip'] / $bedCount) * 100, 1) : 0;

        return array_merge($data, [
            'bed_count'       => $bedCount,
            'available_beds'  => max(0, $bedCount - $data['current_ip']),
            'occupancy_pct'   => $pct,
            'branch_label'    => $branchEnum->label(),
        ]);
    }

    // ─── Bed Occupancy ───────────────────────────────────────────────────────

    public function getBedOccupancy(string $branch, string $date): array
    {
        $branchEnum = Branch::from($branch);
        $bedCount   = $branchEnum->bedCount();
        $data       = $this->repo->getBedOccupancy($branch, $date);
        $kpis       = $this->repo->getKpis($branch, $date);

        $census  = $kpis['current_ip'];
        $pct     = $bedCount > 0 ? round(($census / $bedCount) * 100, 1) : 0;
        $turnover = ($bedCount > 0 && $data['mtd_discharges'] > 0)
            ? round($data['mtd_discharges'] / $bedCount, 2) : 0;

        return array_merge($data, [
            'bed_count'      => $bedCount,
            'occupied'       => $census,
            'available'      => max(0, $bedCount - $census),
            'occupancy_pct'  => $pct,
            'bed_turnover'   => $turnover,
        ]);
    }

    // ─── Admissions ──────────────────────────────────────────────────────────

    public function getAdmissionStats(string $branch, string $from, string $to): array
    {
        return $this->repo->getAdmissionStats($branch, $from, $to);
    }

    // ─── Census ──────────────────────────────────────────────────────────────

    public function getCensus(string $branch, string $date): array
    {
        $branchEnum = Branch::from($branch);
        $bedCount   = $branchEnum->bedCount();
        $data       = $this->repo->getCensus($branch, $date);
        $kpis       = $this->repo->getKpis($branch, $date);

        return array_merge($data, [
            'total_ip' => $kpis['current_ip'],
            'total_er' => $kpis['current_er'],
            'bed_count' => $bedCount,
        ]);
    }

    // ─── Surgery ─────────────────────────────────────────────────────────────

    public function getSurgeryStats(string $branch, string $date, string $from): array
    {
        $data = $this->repo->getSurgeryStats($branch, $date, $from);

        $today = $data['today'];
        $data['today']['utilization_pct'] = $today['total'] > 0
            ? round(($today['completed'] / $today['total']) * 100, 1) : 0;
        $data['today']['cancel_pct'] = $today['total'] > 0
            ? round(($today['cancelled'] / $today['total']) * 100, 1) : 0;

        $mtd = $data['mtd'];
        $data['mtd']['utilization_pct'] = $mtd['total'] > 0
            ? round(($mtd['completed'] / $mtd['total']) * 100, 1) : 0;

        return $data;
    }

    // ─── Department Ops ──────────────────────────────────────────────────────

    public function getDepartmentOps(string $branch, string $from, string $to): array
    {
        return $this->repo->getDepartmentOps($branch, $from, $to);
    }

    // ─── Doctor Ops ──────────────────────────────────────────────────────────

    public function getDoctorOps(string $branch, string $from, string $to): array
    {
        return $this->repo->getDoctorOps($branch, $from, $to);
    }

    // ─── Alerts ──────────────────────────────────────────────────────────────

    public function getAlerts(string $branch, string $date): array
    {
        $bedCount = Branch::from($branch)->bedCount();
        $alerts   = $this->repo->getAlerts($branch, $date, $bedCount);

        // Sort: critical first, then warning, then info
        $order = ['critical' => 0, 'warning' => 1, 'info' => 2];
        usort($alerts, fn ($a, $b) => ($order[$a['type']] ?? 9) <=> ($order[$b['type']] ?? 9));

        return $alerts;
    }

    // ─── Analytics ───────────────────────────────────────────────────────────

    public function getAnalyticsTrends(string $branch, string $from, string $to): array
    {
        return $this->repo->getAnalyticsTrends($branch, $from, $to);
    }
}
