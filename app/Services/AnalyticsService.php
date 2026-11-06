<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\Surgery;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    // ─── Daily trend ─────────────────────────────────────────────────────────

    public function dailyTrend(string|array $branch, string $from, string $to, array $filters = []): Collection
    {
        return BillItem::select(
            DB::raw('DATE(bill_date) as day'),
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('SUM(CASE WHEN patient_type = "OP" THEN net_amount ELSE 0 END) as op_revenue'),
            DB::raw('SUM(CASE WHEN patient_type = "IP" THEN net_amount ELSE 0 END) as ip_revenue'),
            DB::raw('SUM(CASE WHEN patient_type = "ER" THEN net_amount ELSE 0 END) as er_revenue'),
            DB::raw('SUM(CASE WHEN patient_type IS NULL THEN net_amount ELSE 0 END) as ph_revenue')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->groupBy('day')
            ->orderBy('day')
            ->get();
    }

    // ─── Monthly trend ────────────────────────────────────────────────────────

    public function monthlyTrend(string|array $branch, int $year, array $filters = []): array
    {
        $rows = BillItem::select(
            DB::raw('MONTH(bill_date) as month'),
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('COUNT(DISTINCT uhid) as patients')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereYear('bill_date', $year)
            ->saleStatus()
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[] = [
                'month'    => $m,
                'label'    => Carbon::createFromDate($year, $m, 1)->format('M'),
                'revenue'  => (float) ($rows[$m]->revenue ?? 0),
                'patients' => (int)   ($rows[$m]->patients ?? 0),
            ];
        }

        return $months;
    }

    // ─── Department revenue ───────────────────────────────────────────────────

    public function deptRevenue(string|array $branch, string $from, string $to, array $filters = []): Collection
    {
        return BillItem::select(
            'treating_department',
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('COUNT(DISTINCT uhid) as patients'),
            DB::raw('COUNT(*) as transactions')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_department')
            ->where('treating_department', '!=', '')
            ->groupBy('treating_department')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get();
    }

    // ─── Payer mix ────────────────────────────────────────────────────────────

    public function payerMix(string|array $branch, string $from, string $to, array $filters = []): Collection
    {
        return CashierCollection::select(
            'payer_type',
            DB::raw('SUM(paid_amount) as revenue'),
            DB::raw('COUNT(DISTINCT uhid) as patients'),
            DB::raw('COUNT(*) as transactions')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('collection_date', '>=', $from)->whereDate('collection_date', '<=', $to)
            ->groupBy('payer_type')
            ->orderByDesc('revenue')
            ->get();
    }

    // ─── Patient mix ──────────────────────────────────────────────────────────

    public function patientMix(string|array $branch, string $from, string $to, array $filters = []): Collection
    {
        return BillItem::select(
            DB::raw('DATE(bill_date) as day'),
            DB::raw('COUNT(DISTINCT CASE WHEN patient_type = "OP" THEN COALESCE(NULLIF(visit_id, ""), uhid) END) as op'),
            DB::raw('COUNT(DISTINCT CASE WHEN patient_type = "IP" THEN COALESCE(NULLIF(visit_id, ""), uhid) END) as ip'),
            DB::raw('COUNT(DISTINCT CASE WHEN patient_type = "ER" THEN COALESCE(NULLIF(visit_id, ""), uhid) END) as er'),
            DB::raw('COUNT(DISTINCT CASE WHEN patient_type IS NULL THEN COALESCE(NULLIF(visit_id, ""), uhid) END) as pharmacy')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->groupBy('day')
            ->orderBy('day')
            ->get();
    }

    // ─── Branch comparison ────────────────────────────────────────────────────

    public function branchComparison(string $from, string $to): array
    {
        // Aggregate metrics across branches in three queries to reduce DB round-trips
        $billRows = BillItem::select(
            'branch',
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('COUNT(DISTINCT uhid) as patients')
        )
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->groupBy('branch')
            ->get()
            ->keyBy('branch');

        $cashRows = CashierCollection::select(
            'branch',
            DB::raw('SUM(paid_amount) as collection')
        )
            ->whereDate('collection_date', '>=', $from)->whereDate('collection_date', '<=', $to)
            ->groupBy('branch')
            ->get()
            ->keyBy('branch');

        $surgRows = Surgery::select('branch', DB::raw('COUNT(*) as surgeries'))
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->groupBy('branch')
            ->get()
            ->keyBy('branch');

        $result = [];
        foreach (Branch::cases() as $branch) {
            $b = $branch->value;
            $result[$b] = [
                'label'      => $branch->label(),
                'revenue'    => (float) ($billRows->get($b)?->revenue ?? 0),
                'collection' => (float) ($cashRows->get($b)?->collection ?? 0),
                'patients'   => (int)   ($billRows->get($b)?->patients ?? 0),
                'surgeries'  => (int)   ($surgRows->get($b)?->surgeries ?? 0),
            ];
        }

        return $result;
    }

    // ─── Doctor revenue ───────────────────────────────────────────────────────

    public function doctorRevenue(string|array $branch, string $from, string $to, array $filters = []): Collection
    {
        return BillItem::select(
            'treating_doctor',
            'treating_doctor_speciality',
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('COUNT(DISTINCT uhid) as patients')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '')
            ->groupBy('treating_doctor', 'treating_doctor_speciality')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get();
    }

    // ─── Surgeries ────────────────────────────────────────────────────────────

    public function surgeries(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = Surgery::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)
            ->whereDate('surgery_date', '<=', $to);

        return [
            'total'        => (clone $base)->count(),
            'by_category'  => (clone $base)->select('surgery_category', DB::raw('COUNT(*) as count'))
                ->groupBy('surgery_category')->get(),
            'by_dept'      => (clone $base)->select('surgery_department', DB::raw('COUNT(*) as count'))
                ->whereNotNull('surgery_department')
                ->groupBy('surgery_department')->orderByDesc('count')->limit(10)->get(),
            'by_surgeon'   => (clone $base)->select('performing_surgeon', 'surgeon_speciality', DB::raw('COUNT(*) as count'))
                ->whereNotNull('performing_surgeon')
                ->groupBy('performing_surgeon', 'surgeon_speciality')->orderByDesc('count')->limit(10)->get(),
            'by_payer_type' => (clone $base)->select('payer_type', DB::raw('COUNT(*) as count'))
                ->groupBy('payer_type')->get(),
        ];
    }

    public function admissions(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = IpAdmission::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $to);

        return [
            'total' => (clone $base)->count(),
            'by_dept' => (clone $base)->select(
                'treating_department as department',
                'treating_department as dept',
                DB::raw('COUNT(*) as count')
            )
                ->whereNotNull('treating_department')
                ->where('treating_department', '!=', '')
                ->groupBy('treating_department')
                ->orderByDesc('count')
                ->get(),
            'by_gender' => (clone $base)->select('gender', DB::raw('COUNT(*) as count'))
                ->groupBy('gender')->get(),
        ];
    }

    public function ipDemographics(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = IpAdmission::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $to);

        return [
            'total' => (clone $base)->count(),
            'by_age_group' => (clone $base)->select(
                DB::raw("CASE 
                    WHEN age <= 18 THEN '0-18' 
                    WHEN age BETWEEN 19 AND 40 THEN '19-40' 
                    WHEN age BETWEEN 41 AND 60 THEN '41-60' 
                    ELSE '61+' 
                END as label"),
                DB::raw('COUNT(*) as count')
            )->groupBy('label')->get(),
        ];
    }

    public function surgeryDetail(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = Surgery::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)
            ->whereDate('surgery_date', '<=', $to);

        return [
            'total' => (clone $base)->count(),
            'by_speciality' => (clone $base)->select('surgeon_speciality', DB::raw('COUNT(*) as count'))
                ->groupBy('surgeon_speciality')->orderByDesc('count')->get(),
        ];
    }

    public function collectionReport(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = CashierCollection::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('collection_date', '>=', $from)
            ->whereDate('collection_date', '<=', $to);

        return [
            'total' => (clone $base)->sum('paid_amount'),
            'by_payer' => (clone $base)->select('payer_type', DB::raw('SUM(paid_amount) as total'))
                ->groupBy('payer_type')->get(),
        ];
    }

    public function serviceRevenue(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = BillItem::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)
            ->whereDate('bill_date', '<=', $to)
            ->saleStatus();

        return [
            'total' => (clone $base)->sum('net_amount'),
            'by_service' => (clone $base)->select('service_type', DB::raw('SUM(net_amount) as total'))
                ->groupBy('service_type')->orderByDesc('total')->get(),
        ];
    }

    public function doctorPerformance(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = BillItem::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)
            ->whereDate('bill_date', '<=', $to)
            ->saleStatus();

        return [
            'total_revenue' => (clone $base)->sum('net_amount'),
            'by_doctor' => (clone $base)->select('treating_doctor', DB::raw('SUM(net_amount) as total'))
                ->groupBy('treating_doctor')->orderByDesc('total')->limit(10)->get(),
        ];
    }

    public function opMetrics(string|array $branch, string $from, string $to, array $filters = []): array
    {
        $base = BillItem::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)
            ->whereDate('bill_date', '<=', $to)
            ->saleStatus();

        return [
            'op_count' => (clone $base)->where('patient_type', 'OP')->count(),
            'ip_count' => (clone $base)->where('patient_type', 'IP')->count(),
            'patients' => (clone $base)->distinct('uhid')->count('uhid'),
        ];
    }
}
