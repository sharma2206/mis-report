<?php

namespace App\Repositories;

use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\MisReport;
use App\Models\Surgery;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class OperationalRepository
{
    // ─── Census base queries ──────────────────────────────────────────────────

    private function ipCensusBase(string $branch, string $date): Builder
    {
        return IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('discharge_date')
                  ->orWhereDate('discharge_date', '>', $date);
            });
    }

    private function erCensusBase(string $branch, string $date): Builder
    {
        return ErAdmission::where('branch', $branch)
            ->whereDate('admission_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('discharge_date')
                  ->orWhereDate('discharge_date', '>', $date);
            });
    }

    // ─── KPIs ────────────────────────────────────────────────────────────────

    public function getKpis(string $branch, string $date): array
    {
        $from = Carbon::parse($date)->startOfMonth()->toDateString();

        $currentIp  = $this->ipCensusBase($branch, $date)->count();
        $currentEr  = $this->erCensusBase($branch, $date)->count();
        $todayAdm   = IpAdmission::where('branch', $branch)->whereDate('admission_date', $date)->count();
        $todayDis   = IpAdmission::where('branch', $branch)->whereDate('discharge_date', $date)->count();
        $todayEr    = ErAdmission::where('branch', $branch)->whereDate('admission_date', $date)->count();
        $todaySurg  = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)->count();
        $todayOp    = BillItem::where('branch', $branch)->whereDate('bill_date', $date)
                        ->where('patient_type', 'OP')->saleStatus()->distinct('uhid')->count('uhid');

        $mtdAdm  = IpAdmission::where('branch', $branch)
                    ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $date)->count();
        $mtdDis  = IpAdmission::where('branch', $branch)
                    ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)->count();
        $mtdEr   = ErAdmission::where('branch', $branch)
                    ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $date)->count();
        $mtdSurg = Surgery::where('branch', $branch)
                    ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $date)->count();

        $avgLos = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)
            ->whereNotNull('actual_los')->where('actual_los', '>', 0)
            ->avg('actual_los');

        $surgCompleted = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)
                            ->where('status', 'Completed')->count();
        $surgCancelled = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)
                            ->where('status', 'Cancelled')->count();
        $emergencySurg = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)
                            ->where('ot_surgery_type', 'Emergency')->count();
        $electiveSurg  = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)
                            ->where('ot_surgery_type', 'Elective')->count();

        $pendingDis = $this->ipCensusBase($branch, $date)
            ->whereDate('admission_date', '<=', Carbon::parse($date)->subDays(7)->toDateString())
            ->count();

        return [
            'current_ip'        => $currentIp,
            'current_er'        => $currentEr,
            'today_admissions'  => $todayAdm,
            'today_discharges'  => $todayDis,
            'today_er'          => $todayEr,
            'today_op'          => $todayOp,
            'today_surgeries'   => $todaySurg,
            'mtd_admissions'    => $mtdAdm,
            'mtd_discharges'    => $mtdDis,
            'mtd_er'            => $mtdEr,
            'mtd_surgeries'     => $mtdSurg,
            'avg_los'           => round((float) ($avgLos ?? 0), 1),
            'surg_completed'    => $surgCompleted,
            'surg_cancelled'    => $surgCancelled,
            'surg_emergency'    => $emergencySurg,
            'surg_elective'     => $electiveSurg,
            'pending_discharge' => $pendingDis,
        ];
    }

    // ─── Bed Occupancy ───────────────────────────────────────────────────────

    public function getBedOccupancy(string $branch, string $date): array
    {
        $from       = Carbon::parse($date)->startOfMonth()->toDateString();
        $twoWeekAgo = Carbon::parse($date)->subDays(13)->toDateString();

        $wardBreakdown = $this->ipCensusBase($branch, $date)
            ->select('ward', DB::raw('COUNT(*) as occupied'))
            ->whereNotNull('ward')->where('ward', '!=', '')
            ->groupBy('ward')->orderByDesc('occupied')->get();

        $roomBreakdown = $this->ipCensusBase($branch, $date)
            ->select('room', DB::raw('COUNT(*) as occupied'))
            ->whereNotNull('room')->where('room', '!=', '')
            ->groupBy('room')->orderByDesc('occupied')->get();

        $billingCatBreakdown = $this->ipCensusBase($branch, $date)
            ->select('billing_category', DB::raw('COUNT(*) as occupied'))
            ->whereNotNull('billing_category')->where('billing_category', '!=', '')
            ->groupBy('billing_category')->orderByDesc('occupied')->get();

        $avgLos = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)
            ->whereNotNull('actual_los')->where('actual_los', '>', 0)
            ->avg('actual_los');

        $dischargedToday    = IpAdmission::where('branch', $branch)->whereDate('discharge_date', $date)->count();
        $expectedDischarges = $this->ipCensusBase($branch, $date)
            ->whereDate('admission_date', '<=', Carbon::parse($date)->subDays(3)->toDateString())->count();
        $mtdDischarges = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)->count();
        $mtdAdmissions = IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $date)->count();

        $admTrend = IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $twoWeekAgo)->whereDate('admission_date', '<=', $date)
            ->select(DB::raw('DATE(admission_date) as day'), DB::raw('COUNT(*) as cnt'))
            ->groupBy('day')->orderBy('day')->get();

        $occTrend = MisReport::where('branch', $branch)
            ->whereDate('report_date', '>=', $twoWeekAgo)->whereDate('report_date', '<=', $date)
            ->select('report_date as day', 'occupancy', 'occupancy_pct')
            ->orderBy('day')->get();

        $disTypeDist = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)
            ->whereNotNull('discharge_type')->where('discharge_type', '!=', '')
            ->select('discharge_type', DB::raw('COUNT(*) as cnt'))
            ->groupBy('discharge_type')->orderByDesc('cnt')->get();

        return [
            'ward_breakdown'      => $wardBreakdown,
            'room_breakdown'      => $roomBreakdown,
            'billing_cat'         => $billingCatBreakdown,
            'avg_los'             => round((float) ($avgLos ?? 0), 1),
            'discharged_today'    => $dischargedToday,
            'expected_discharges' => $expectedDischarges,
            'mtd_discharges'      => $mtdDischarges,
            'mtd_admissions'      => $mtdAdmissions,
            'adm_trend'           => $admTrend,
            'occ_trend'           => $occTrend,
            'dis_type_dist'       => $disTypeDist,
        ];
    }

    // ─── Admission & Discharge Stats ─────────────────────────────────────────

    public function getAdmissionStats(string $branch, string $from, string $to): array
    {
        $ipBase  = IpAdmission::where('branch', $branch);
        $erBase  = ErAdmission::where('branch', $branch);

        $admByType = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('admission_type')->where('admission_type', '!=', '')
            ->select('admission_type', DB::raw('COUNT(*) as cnt'))
            ->groupBy('admission_type')->orderByDesc('cnt')->get();

        $admBySource = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('admission_source')->where('admission_source', '!=', '')
            ->select('admission_source', DB::raw('COUNT(*) as cnt'))
            ->groupBy('admission_source')->orderByDesc('cnt')->get();

        $admTrend = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->select(DB::raw('DATE(admission_date) as day'), DB::raw('COUNT(*) as admissions'))
            ->groupBy('day')->orderBy('day')->get();

        $disTrend = $ipBase->clone()
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->select(DB::raw('DATE(discharge_date) as day'), DB::raw('COUNT(*) as discharges'))
            ->groupBy('day')->orderBy('day')->get();

        $erTrend = $erBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->select(DB::raw('DATE(admission_date) as day'), DB::raw('COUNT(*) as er_count'))
            ->groupBy('day')->orderBy('day')->get();

        $disByType = $ipBase->clone()
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->whereNotNull('discharge_type')->where('discharge_type', '!=', '')
            ->select('discharge_type', DB::raw('COUNT(*) as cnt'))
            ->groupBy('discharge_type')->orderByDesc('cnt')->get();

        $admByDept = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->select('treating_department', DB::raw('COUNT(*) as cnt'))
            ->groupBy('treating_department')->orderByDesc('cnt')->limit(15)->get();

        $admByPayer = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('payer_type')
            ->select('payer_type', DB::raw('COUNT(*) as cnt'))
            ->groupBy('payer_type')->orderByDesc('cnt')->get();

        $highRisk = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->where('high_risk', true)->count();

        $mlcCases = $ipBase->clone()
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->where('mlc', true)->count();

        return [
            'adm_by_type'   => $admByType,
            'adm_by_source' => $admBySource,
            'adm_trend'     => $admTrend,
            'dis_trend'     => $disTrend,
            'er_trend'      => $erTrend,
            'dis_by_type'   => $disByType,
            'adm_by_dept'   => $admByDept,
            'adm_by_payer'  => $admByPayer,
            'high_risk'     => $highRisk,
            'mlc_cases'     => $mlcCases,
        ];
    }

    // ─── Patient Census ──────────────────────────────────────────────────────

    public function getCensus(string $branch, string $date): array
    {
        $wardCensus = $this->ipCensusBase($branch, $date)
            ->select('ward', DB::raw('COUNT(*) as patients'))
            ->whereNotNull('ward')->where('ward', '!=', '')
            ->groupBy('ward')->orderByDesc('patients')->get();

        $deptCensus = $this->ipCensusBase($branch, $date)
            ->select(
                'treating_department',
                DB::raw('COUNT(*) as patients'),
                DB::raw('SUM(CASE WHEN gender IN ("M","Male") THEN 1 ELSE 0 END) as male'),
                DB::raw('SUM(CASE WHEN gender IN ("F","Female") THEN 1 ELSE 0 END) as female')
            )
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->groupBy('treating_department')->orderByDesc('patients')->get();

        $doctorCensus = $this->ipCensusBase($branch, $date)
            ->select('treating_doctor', 'treating_department', DB::raw('COUNT(*) as patients'))
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->groupBy('treating_doctor', 'treating_department')->orderByDesc('patients')->get();

        $genderDist = $this->ipCensusBase($branch, $date)
            ->select('gender', DB::raw('COUNT(*) as cnt'))
            ->whereNotNull('gender')->where('gender', '!=', '')
            ->groupBy('gender')->get();

        $ageDist = $this->ipCensusBase($branch, $date)
            ->select(
                DB::raw("CASE
                    WHEN age < 1  THEN 'Infant (<1)'
                    WHEN age <= 12 THEN 'Child (1-12)'
                    WHEN age <= 17 THEN 'Teen (13-17)'
                    WHEN age <= 35 THEN 'Young (18-35)'
                    WHEN age <= 60 THEN 'Adult (36-60)'
                    ELSE 'Senior (60+)'
                END as age_group"),
                DB::raw('COUNT(*) as cnt'),
                DB::raw('MIN(age) as min_age')
            )
            ->whereNotNull('age')
            ->groupBy('age_group')->orderBy('min_age')->get();

        $payerDist = $this->ipCensusBase($branch, $date)
            ->select('payer_type', DB::raw('COUNT(*) as cnt'))
            ->whereNotNull('payer_type')
            ->groupBy('payer_type')->orderByDesc('cnt')->get();

        $insuranceDist = $this->ipCensusBase($branch, $date)
            ->select('payer_name', 'payer_type', DB::raw('COUNT(*) as cnt'))
            ->whereIn('payer_type', ['tpa', 'insurance', 'corporate'])
            ->whereNotNull('payer_name')->where('payer_name', '!=', '')
            ->groupBy('payer_name', 'payer_type')->orderByDesc('cnt')->limit(15)->get();

        $dailyCensus = MisReport::where('branch', $branch)
            ->whereDate('report_date', '>=', Carbon::parse($date)->subDays(13)->toDateString())
            ->whereDate('report_date', '<=', $date)
            ->select('report_date as day', 'occupancy as census')
            ->orderBy('day')->get();

        $erCensus = $this->erCensusBase($branch, $date)
            ->select('treating_department', DB::raw('COUNT(*) as patients'))
            ->whereNotNull('treating_department')
            ->groupBy('treating_department')->orderByDesc('patients')->get();

        return [
            'ward_census'    => $wardCensus,
            'dept_census'    => $deptCensus,
            'doctor_census'  => $doctorCensus,
            'gender_dist'    => $genderDist,
            'age_dist'       => $ageDist,
            'payer_dist'     => $payerDist,
            'insurance_dist' => $insuranceDist,
            'daily_census'   => $dailyCensus,
            'er_census'      => $erCensus,
        ];
    }

    // ─── Surgery Operations ──────────────────────────────────────────────────

    public function getSurgeryStats(string $branch, string $date, string $from): array
    {
        $today   = Surgery::where('branch', $branch)->whereDate('surgery_date', $date);
        $mtdBase = Surgery::where('branch', $branch)
                    ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $date);

        $todayStats = [
            'total'     => $today->clone()->count(),
            'completed' => $today->clone()->where('status', 'Completed')->count(),
            'cancelled' => $today->clone()->where('status', 'Cancelled')->count(),
            'postponed' => $today->clone()->where('status', 'Postponed')->count(),
            'emergency' => $today->clone()->where('ot_surgery_type', 'Emergency')->count(),
            'elective'  => $today->clone()->where('ot_surgery_type', 'Elective')->count(),
            'major'     => $today->clone()->where('surgery_category', 'Major')->count(),
            'minor'     => $today->clone()->where('surgery_category', 'Minor')->count(),
        ];

        $otRooms = $mtdBase->clone()
            ->select('ot_name',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN status = "Cancelled" THEN 1 ELSE 0 END) as cancelled'),
                DB::raw('SUM(CASE WHEN ot_surgery_type = "Emergency" THEN 1 ELSE 0 END) as emergency')
            )
            ->whereNotNull('ot_name')->where('ot_name', '!=', '')
            ->groupBy('ot_name')->orderByDesc('total')->get();

        $surgeonPerf = $mtdBase->clone()
            ->select('performing_surgeon', 'surgeon_department',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN ot_surgery_type = "Emergency" THEN 1 ELSE 0 END) as emergency'),
                DB::raw('SUM(CASE WHEN surgery_category = "Major" THEN 1 ELSE 0 END) as major')
            )
            ->whereNotNull('performing_surgeon')->where('performing_surgeon', '!=', '')
            ->groupBy('performing_surgeon', 'surgeon_department')->orderByDesc('total')->limit(20)->get();

        $surgTrend = $mtdBase->clone()
            ->select(
                DB::raw('DATE(surgery_date) as day'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN ot_surgery_type = "Emergency" THEN 1 ELSE 0 END) as emergency'),
                DB::raw('SUM(CASE WHEN ot_surgery_type = "Elective" THEN 1 ELSE 0 END) as elective')
            )
            ->groupBy('day')->orderBy('day')->get();

        $surgByDept = $mtdBase->clone()
            ->select('surgery_department',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN surgery_category = "Major" THEN 1 ELSE 0 END) as major'),
                DB::raw('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END) as completed')
            )
            ->whereNotNull('surgery_department')->where('surgery_department', '!=', '')
            ->groupBy('surgery_department')->orderByDesc('total')->get();

        $mtdStats = [
            'total'     => $mtdBase->clone()->count(),
            'completed' => $mtdBase->clone()->where('status', 'Completed')->count(),
            'cancelled' => $mtdBase->clone()->where('status', 'Cancelled')->count(),
            'emergency' => $mtdBase->clone()->where('ot_surgery_type', 'Emergency')->count(),
            'elective'  => $mtdBase->clone()->where('ot_surgery_type', 'Elective')->count(),
            'major'     => $mtdBase->clone()->where('surgery_category', 'Major')->count(),
        ];

        return [
            'today'      => $todayStats,
            'mtd'        => $mtdStats,
            'ot_rooms'   => $otRooms,
            'surgeons'   => $surgeonPerf,
            'trend'      => $surgTrend,
            'by_dept'    => $surgByDept,
        ];
    }

    // ─── Department Operations ───────────────────────────────────────────────

    public function getDepartmentOps(string $branch, string $from, string $to): array
    {
        $revenue = BillItem::where('branch', $branch)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->select(
                'treating_department',
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('SUM(discount_amount) as total_discount'),
                DB::raw('COUNT(DISTINCT uhid) as patients'),
                DB::raw('COUNT(*) as transactions')
            )
            ->groupBy('treating_department')->orderByDesc('revenue')->get();

        $ipStats = IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->select('treating_department',
                DB::raw('COUNT(*) as admissions'),
                DB::raw('AVG(actual_los) as avg_los')
            )
            ->groupBy('treating_department')->get()->keyBy('treating_department');

        $disStats = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->select('treating_department', DB::raw('COUNT(*) as discharges'))
            ->groupBy('treating_department')->get()->keyBy('treating_department');

        $census = $this->ipCensusBase($branch, $to)
            ->select('treating_department', DB::raw('COUNT(*) as current_patients'))
            ->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->groupBy('treating_department')->get()->keyBy('treating_department');

        return $revenue->map(function ($row) use ($ipStats, $disStats, $census) {
            $ip  = $ipStats->get($row->treating_department);
            $dis = $disStats->get($row->treating_department);
            $cen = $census->get($row->treating_department);
            $rev = (float) $row->revenue;
            $pat = (int) $row->patients;
            return [
                'department'       => $row->treating_department,
                'revenue'          => $rev,
                'total_discount'   => (float) $row->total_discount,
                'patients'         => $pat,
                'transactions'     => (int) $row->transactions,
                'admissions'       => $ip ? (int) $ip->admissions : 0,
                'discharges'       => $dis ? (int) $dis->discharges : 0,
                'current_patients' => $cen ? (int) $cen->current_patients : 0,
                'avg_los'          => $ip ? round((float) $ip->avg_los, 1) : null,
                'avg_revenue'      => $pat > 0 ? round($rev / $pat, 2) : 0,
            ];
        })->values()->toArray();
    }

    // ─── Doctor Operations ───────────────────────────────────────────────────

    public function getDoctorOps(string $branch, string $from, string $to): array
    {
        $revenue = BillItem::where('branch', $branch)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->select(
                'treating_doctor',
                'treating_department',
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('SUM(CASE WHEN patient_type="OP" THEN net_amount ELSE 0 END) as op_revenue'),
                DB::raw('SUM(CASE WHEN patient_type="IP" THEN net_amount ELSE 0 END) as ip_revenue'),
                DB::raw('SUM(CASE WHEN patient_type="ER" THEN net_amount ELSE 0 END) as er_revenue'),
                DB::raw('COUNT(DISTINCT uhid) as patients'),
                DB::raw('SUM(discount_amount) as total_discount')
            )
            ->groupBy('treating_doctor', 'treating_department')->orderByDesc('revenue')->limit(30)->get();

        $ipStats = IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->select('treating_doctor', DB::raw('COUNT(*) as admissions'), DB::raw('AVG(actual_los) as avg_los'))
            ->groupBy('treating_doctor')->get()->keyBy('treating_doctor');

        $disStats = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->select('treating_doctor', DB::raw('COUNT(*) as discharges'))
            ->groupBy('treating_doctor')->get()->keyBy('treating_doctor');

        $census = $this->ipCensusBase($branch, $to)
            ->select('treating_doctor', DB::raw('COUNT(*) as current_patients'))
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->groupBy('treating_doctor')->get()->keyBy('treating_doctor');

        return $revenue->map(function ($row) use ($ipStats, $disStats, $census) {
            $ip  = $ipStats->get($row->treating_doctor);
            $dis = $disStats->get($row->treating_doctor);
            $cen = $census->get($row->treating_doctor);
            return [
                'doctor'           => $row->treating_doctor,
                'department'       => $row->treating_department,
                'revenue'          => (float) $row->revenue,
                'op_revenue'       => (float) $row->op_revenue,
                'ip_revenue'       => (float) $row->ip_revenue,
                'er_revenue'       => (float) $row->er_revenue,
                'patients'         => (int) $row->patients,
                'total_discount'   => (float) $row->total_discount,
                'admissions'       => $ip ? (int) $ip->admissions : 0,
                'discharges'       => $dis ? (int) $dis->discharges : 0,
                'current_patients' => $cen ? (int) $cen->current_patients : 0,
                'avg_los'          => $ip ? round((float) $ip->avg_los, 1) : null,
            ];
        })->values()->toArray();
    }

    // ─── Operational Alerts ──────────────────────────────────────────────────

    public function getAlerts(string $branch, string $date, int $bedCount): array
    {
        $alerts = [];
        $from   = Carbon::parse($date)->startOfMonth()->toDateString();

        // Bed occupancy
        $census = $this->ipCensusBase($branch, $date)->count();
        if ($bedCount > 0) {
            $pct = ($census / $bedCount) * 100;
            if ($pct >= 90) {
                $alerts[] = ['type' => 'critical', 'code' => 'HIGH_OCCUPANCY', 'icon' => 'bed',
                    'title' => 'Critical Bed Occupancy',
                    'message' => "Occupancy at " . round($pct) . "% — {$census} of {$bedCount} beds occupied"];
            } elseif ($pct >= 80) {
                $alerts[] = ['type' => 'warning', 'code' => 'ELEVATED_OCCUPANCY', 'icon' => 'bed',
                    'title' => 'Elevated Bed Occupancy',
                    'message' => "Occupancy at " . round($pct) . "% — {$census} of {$bedCount} beds occupied"];
            }
        }

        // No admissions today
        $todayAdm = IpAdmission::where('branch', $branch)->whereDate('admission_date', $date)->count();
        if ($todayAdm === 0) {
            $alerts[] = ['type' => 'warning', 'code' => 'NO_ADMISSIONS', 'icon' => 'user-plus',
                'title' => 'No Admissions Today', 'message' => 'No IP admissions recorded for today'];
        }

        // No ER cases
        $todayEr = ErAdmission::where('branch', $branch)->whereDate('admission_date', $date)->count();
        if ($todayEr === 0) {
            $alerts[] = ['type' => 'info', 'code' => 'NO_ER', 'icon' => 'ambulance',
                'title' => 'No ER Cases Today', 'message' => 'No emergency admissions recorded today'];
        }

        // No surgical cases
        $todaySurg = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)->count();
        if ($todaySurg === 0) {
            $alerts[] = ['type' => 'info', 'code' => 'NO_SURGERY', 'icon' => 'scissors',
                'title' => 'No OT Cases Today', 'message' => 'No surgeries recorded for today'];
        }

        // High cancellation rate
        if ($todaySurg > 0) {
            $cancelled = Surgery::where('branch', $branch)->whereDate('surgery_date', $date)
                ->where('status', 'Cancelled')->count();
            $cancelPct = ($cancelled / $todaySurg) * 100;
            if ($cancelPct >= 20) {
                $alerts[] = ['type' => 'warning', 'code' => 'HIGH_CANCEL_RATE', 'icon' => 'x-circle',
                    'title' => 'High OT Cancellation Rate',
                    'message' => round($cancelPct) . "% surgeries cancelled today ({$cancelled}/{$todaySurg})"];
            }
        }

        // High average LOS
        $avgLos = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $date)
            ->whereNotNull('actual_los')->avg('actual_los');
        if ($avgLos && $avgLos > 7) {
            $alerts[] = ['type' => 'warning', 'code' => 'HIGH_LOS', 'icon' => 'clock',
                'title' => 'High Average LOS',
                'message' => "Average Length of Stay is " . round($avgLos, 1) . " days this month"];
        }

        // Long-stay patients (admitted > 7 days, still in)
        $pendingDis = $this->ipCensusBase($branch, $date)
            ->whereDate('admission_date', '<=', Carbon::parse($date)->subDays(7)->toDateString())->count();
        if ($pendingDis > 3) {
            $alerts[] = ['type' => 'warning', 'code' => 'PENDING_DISCHARGE', 'icon' => 'alert-triangle',
                'title' => 'Pending Long-Stay Discharges',
                'message' => "{$pendingDis} patients admitted 7+ days ago are still in-ward"];
        }

        // Missing bill data
        $billsToday = BillItem::where('branch', $branch)->whereDate('bill_date', $date)->count();
        if ($billsToday === 0) {
            $alerts[] = ['type' => 'critical', 'code' => 'MISSING_BILLS', 'icon' => 'file-x',
                'title' => 'Missing Bill Data',
                'message' => 'No bill items found for today. Upload the bill items CSV.'];
        }

        // No cash collection
        $cashToday = CashierCollection::where('branch', $branch)->whereDate('collection_date', $date)
            ->where('payer_type', 'cash')->sum('paid_amount');
        if ((float) $cashToday == 0) {
            $alerts[] = ['type' => 'warning', 'code' => 'NO_CASH', 'icon' => 'banknote',
                'title' => 'No Cash Collection Today', 'message' => 'Zero cash collections recorded today'];
        }

        return $alerts;
    }

    // ─── Analytics Trends ────────────────────────────────────────────────────

    public function getAnalyticsTrends(string $branch, string $from, string $to): array
    {
        $admTrend = IpAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->select(DB::raw('DATE(admission_date) as day'), DB::raw('COUNT(*) as admissions'))
            ->groupBy('day')->orderBy('day')->get();

        $disTrend = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->select(DB::raw('DATE(discharge_date) as day'), DB::raw('COUNT(*) as discharges'))
            ->groupBy('day')->orderBy('day')->get();

        $erTrend = ErAdmission::where('branch', $branch)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->select(DB::raw('DATE(admission_date) as day'), DB::raw('COUNT(*) as er'))
            ->groupBy('day')->orderBy('day')->get();

        $surgTrend = Surgery::where('branch', $branch)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->select(DB::raw('DATE(surgery_date) as day'), DB::raw('COUNT(*) as surgeries'))
            ->groupBy('day')->orderBy('day')->get();

        $occTrend = MisReport::where('branch', $branch)
            ->whereDate('report_date', '>=', $from)->whereDate('report_date', '<=', $to)
            ->select('report_date as day', 'occupancy', 'occupancy_pct')
            ->orderBy('day')->get();

        $losTrend = IpAdmission::where('branch', $branch)
            ->whereDate('discharge_date', '>=', $from)->whereDate('discharge_date', '<=', $to)
            ->whereNotNull('actual_los')->where('actual_los', '>', 0)
            ->select(DB::raw('DATE(discharge_date) as day'), DB::raw('ROUND(AVG(actual_los),1) as avg_los'))
            ->groupBy('day')->orderBy('day')->get();

        $deptLoad = BillItem::where('branch', $branch)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()->whereNotNull('treating_department')->where('treating_department', '!=', '')
            ->select('treating_department',
                DB::raw('COUNT(DISTINCT uhid) as patients'),
                DB::raw('SUM(net_amount) as revenue')
            )
            ->groupBy('treating_department')->orderByDesc('revenue')->limit(12)->get();

        $wardOcc = $this->ipCensusBase($branch, $to)
            ->select('ward', DB::raw('COUNT(*) as patients'))
            ->whereNotNull('ward')->where('ward', '!=', '')
            ->groupBy('ward')->orderByDesc('patients')->get();

        $doctorWorkload = BillItem::where('branch', $branch)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->select('treating_doctor',
                DB::raw('COUNT(DISTINCT uhid) as patients'),
                DB::raw('SUM(net_amount) as revenue')
            )
            ->groupBy('treating_doctor')->orderByDesc('patients')->limit(12)->get();

        $otUtilization = Surgery::where('branch', $branch)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->whereNotNull('ot_name')
            ->select('ot_name',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status="Completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN ot_surgery_type="Emergency" THEN 1 ELSE 0 END) as emergency')
            )
            ->groupBy('ot_name')->orderByDesc('total')->get();

        return [
            'adm_trend'       => $admTrend,
            'dis_trend'       => $disTrend,
            'er_trend'        => $erTrend,
            'surg_trend'      => $surgTrend,
            'occ_trend'       => $occTrend,
            'los_trend'       => $losTrend,
            'dept_load'       => $deptLoad,
            'ward_occ'        => $wardOcc,
            'doctor_workload' => $doctorWorkload,
            'ot_utilization'  => $otUtilization,
        ];
    }
}
