<?php

namespace App\Services;

use App\Models\Surgery;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SurgeryAnalyticsService
{
    private function base($branch, string $from, string $to, array $filters = [])
    {
        return Surgery::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)
            ->whereDate('surgery_date', '<=', $to);
    }

    // ── KPIs ─────────────────────────────────────────────────────────────────

    public function kpis($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        $total      = (clone $b)->count();
        $completed  = (clone $b)->where('status', 'like', '%Completed%')->count();
        $cancelled  = (clone $b)->where('status', 'like', '%Cancel%')->count();
        $scheduled  = (clone $b)->where('status', 'like', '%Schedul%')->count();
        $emergency  = (clone $b)->where('surgery_category', 'like', '%Emergency%')->count();
        $elective   = (clone $b)->where('surgery_category', 'like', '%Elective%')->count();
        $major      = (clone $b)->where('surgery_category', 'like', '%Major%')->count();
        $minor      = (clone $b)->where('surgery_category', 'like', '%Minor%')->count();
        $implant    = (clone $b)->where('implant_required', true)->count();
        $blood      = (clone $b)->where('blood_required', true)->count();

        $avgDuration = round((float)(clone $b)->whereNotNull('surgery_duration_min')->avg('surgery_duration_min') ?? 0, 1);
        $avgOtDuration = round((float)(clone $b)->whereNotNull('ot_duration_min')->avg('ot_duration_min') ?? 0, 1);
        $avgLos     = round((float)(clone $b)->whereNotNull('los')->avg('los') ?? 0, 2);
        $avgIcuLos  = round((float)(clone $b)->whereNotNull('icu_los')->avg('icu_los') ?? 0, 2);

        $delayed = (clone $b)->whereNotNull('surgery_duration_min')
            ->where('surgery_duration_min', '>', DB::raw('(SELECT AVG(surgery_duration_min)*1.5 FROM surgeries WHERE surgery_duration_min IS NOT NULL)'))
            ->count();

        return compact(
            'total', 'completed', 'cancelled', 'scheduled',
            'emergency', 'elective', 'major', 'minor',
            'implant', 'blood',
            'avgDuration', 'avgOtDuration', 'avgLos', 'avgIcuLos', 'delayed'
        );
    }

    // ── Trend ─────────────────────────────────────────────────────────────────

    public function trend($branch, string $from, string $to, array $filters = []): array
    {
        $days = (clone $this->base($branch, $from, $to, $filters))
            ->select(
                DB::raw('DATE(surgery_date) as day'),
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Major%" THEN 1 END) as major'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Minor%" THEN 1 END) as minor'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Emergency%" THEN 1 END) as emergency'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Elective%" THEN 1 END) as elective')
            )
            ->groupBy('day')->orderBy('day')->get();

        $months = Surgery::forBranch($branch)->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->select(
                DB::raw('DATE_FORMAT(surgery_date, "%Y-%m") as month'),
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Major%" THEN 1 END) as major'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Minor%" THEN 1 END) as minor')
            )
            ->groupBy('month')->orderBy('month')->get();

        return ['daily' => $days, 'monthly' => $months];
    }

    // ── Distribution ──────────────────────────────────────────────────────────

    public function distribution($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        return [
            'by_department'     => (clone $b)->select(DB::raw('IFNULL(surgery_department,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->limit(15)->get(),
            'by_sub_department' => (clone $b)->select(DB::raw('IFNULL(surgery_sub_department,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->limit(15)->get(),
            'by_specialty'      => (clone $b)->select(DB::raw('IFNULL(surgeon_speciality,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->limit(15)->get(),
            'by_surgery_type'   => (clone $b)->select(DB::raw('IFNULL(surgery_type,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'by_category'       => (clone $b)->select(DB::raw('IFNULL(surgery_category,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'by_status'         => (clone $b)->select(DB::raw('IFNULL(status,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'top_surgery_names' => (clone $b)->select(DB::raw('IFNULL(surgery_name,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->limit(15)->get(),
            'top_diagnoses'     => (clone $b)->select(DB::raw('IFNULL(diagnosis_name,"Unknown") as label'), DB::raw('COUNT(*) as count'))->whereNotNull('diagnosis_name')->groupBy('label')->orderByDesc('count')->limit(15)->get(),
        ];
    }

    // ── Surgeon Performance ───────────────────────────────────────────────────

    public function surgeonPerformance($branch, string $from, string $to, array $filters = []): array
    {
        $rows = $this->base($branch, $from, $to, $filters)
            ->select(
                DB::raw('IFNULL(performing_surgeon,"Unknown") as surgeon'),
                DB::raw('IFNULL(surgeon_speciality,"") as speciality'),
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Major%" THEN 1 END) as major'),
                DB::raw('COUNT(CASE WHEN surgery_category LIKE "%Emergency%" THEN 1 END) as emergency'),
                DB::raw('COUNT(CASE WHEN status LIKE "%Cancel%" THEN 1 END) as cancelled'),
                DB::raw('ROUND(AVG(surgery_duration_min),1) as avg_duration'),
                DB::raw('ROUND(AVG(los),2) as avg_los'),
                DB::raw('COUNT(DISTINCT uhid) as patients')
            )
            ->whereNotNull('performing_surgeon')
            ->groupBy('surgeon', 'speciality')
            ->orderByDesc('total')
            ->get();

        return ['surgeons' => $rows];
    }

    // ── OT Dashboard ──────────────────────────────────────────────────────────

    public function otDashboard($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        $byOt = (clone $b)->select(
            DB::raw('IFNULL(ot_name,"Unknown") as ot'),
            DB::raw('COUNT(*) as cases'),
            DB::raw('ROUND(AVG(ot_duration_min),1) as avg_duration'),
            DB::raw('SUM(ot_duration_min) as total_minutes')
        )->groupBy('ot')->orderByDesc('cases')->get();

        // Peak-hours heatmap: day_of_week × hour
        $heatmap = (clone $b)->select(
            DB::raw('DAYOFWEEK(surgery_start) as dow'),
            DB::raw('HOUR(surgery_start) as hour'),
            DB::raw('COUNT(*) as count')
        )->whereNotNull('surgery_start')
            ->groupBy('dow', 'hour')
            ->orderBy('dow')->orderBy('hour')
            ->get();

        return ['by_ot' => $byOt, 'heatmap' => $heatmap];
    }

    // ── Anaesthesia ───────────────────────────────────────────────────────────

    public function anaesthesia($branch, string $from, string $to, array $filters = []): array
    {
        $rows = $this->base($branch, $from, $to, $filters)
            ->select(
                DB::raw('IFNULL(anaesthesia_type,"Unknown") as label'),
                DB::raw('COUNT(*) as count'),
                DB::raw('ROUND(AVG(surgery_duration_min),1) as avg_duration')
            )
            ->groupBy('label')->orderByDesc('count')->get();

        return ['distribution' => $rows];
    }

    // ── Patient Profile ───────────────────────────────────────────────────────

    public function patientProfile($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        return [
            'by_gender'      => (clone $b)->select(DB::raw('IFNULL(gender,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'by_patient_type'=> (clone $b)->select(DB::raw('IFNULL(patient_type,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'by_blood_group' => (clone $b)->select(DB::raw('IFNULL(blood_group,"Unknown") as label'), DB::raw('COUNT(*) as count'))->whereNotNull('blood_group')->groupBy('label')->orderByDesc('count')->get(),
            'by_age_group'   => (clone $b)->select(
                DB::raw("CASE WHEN CAST(age AS UNSIGNED) <= 18 THEN '0-18' WHEN CAST(age AS UNSIGNED) <= 40 THEN '19-40' WHEN CAST(age AS UNSIGNED) <= 60 THEN '41-60' ELSE '61+' END as label"),
                DB::raw('COUNT(*) as count')
            )->whereNotNull('age')->groupBy('label')->orderBy('label')->get(),
            'blood_required_count'  => (clone $b)->where('blood_required', true)->count(),
            'implant_count'         => (clone $b)->where('implant_required', true)->count(),
            'avg_los'               => round((float)(clone $b)->avg('los') ?? 0, 2),
            'avg_icu_los'           => round((float)(clone $b)->avg('icu_los') ?? 0, 2),
        ];
    }

    // ── Quality Metrics ───────────────────────────────────────────────────────

    public function qualityMetrics($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        return [
            'pac_distribution'       => (clone $b)->select(DB::raw('IFNULL(pac_status,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'pac_cleared'            => (clone $b)->where('pac_clearance', true)->count(),
            'antibiotic_compliance'  => (clone $b)->select(DB::raw('IFNULL(antibiotic_compliance,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'contamination'          => (clone $b)->select(DB::raw('IFNULL(surgery_contamination,"Unknown") as label'), DB::raw('COUNT(*) as count'))->whereNotNull('surgery_contamination')->groupBy('label')->orderByDesc('count')->get(),
            'delayed_cases'          => (clone $b)->select('patient_name', 'surgery_name', 'surgery_date', 'performing_surgeon', 'surgery_duration_min')
                ->whereNotNull('surgery_duration_min')
                ->orderByDesc('surgery_duration_min')
                ->limit(10)->get(),
        ];
    }

    // ── Payer Analytics ───────────────────────────────────────────────────────

    public function payerAnalytics($branch, string $from, string $to, array $filters = []): array
    {
        $b = $this->base($branch, $from, $to, $filters);

        return [
            'by_payer_type'     => (clone $b)->select(DB::raw('IFNULL(payer_type,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
            'by_payer_name'     => (clone $b)->select(DB::raw('IFNULL(payer_name,"Unknown") as label'), DB::raw('COUNT(*) as count'))->whereNotNull('payer_name')->groupBy('label')->orderByDesc('count')->limit(15)->get(),
            'by_billing_category'=> (clone $b)->select(DB::raw('IFNULL(billing_category,"Unknown") as label'), DB::raw('COUNT(*) as count'))->groupBy('label')->orderByDesc('count')->get(),
        ];
    }

    // ── AI Insights ───────────────────────────────────────────────────────────

    public function insights($branch, string $from, string $to, array $filters = []): array
    {
        $curr   = $this->kpis($branch, $from, $to, $filters);
        $days   = max(1, Carbon::parse($from)->diffInDays(Carbon::parse($to)));
        $prevTo = Carbon::parse($from)->subDay()->format('Y-m-d');
        $prevFrom = Carbon::parse($prevTo)->subDays($days)->format('Y-m-d');
        $prev   = $this->kpis($branch, $prevFrom, $prevTo, $filters);

        $insights = [];

        $this->addDelta($insights, 'Total Surgeries', $curr['total'], $prev['total'], 'surgeries performed', '🔪');
        $this->addDelta($insights, 'Emergency Cases', $curr['emergency'], $prev['emergency'], 'emergency cases', '🚨');
        $this->addDelta($insights, 'Cancellations', $curr['cancelled'], $prev['cancelled'], 'cancelled surgeries', '❌', true);
        $this->addDelta($insights, 'Avg Duration', $curr['avgDuration'], $prev['avgDuration'], 'min avg surgery duration', '⏱️', true);
        $this->addDelta($insights, 'Avg LOS', $curr['avgLos'], $prev['avgLos'], 'days avg length of stay', '🛏️', true);
        $this->addDelta($insights, 'Implant Cases', $curr['implant'], $prev['implant'], 'implant cases', '🦿');

        // Top surgeon insight
        $top = Surgery::forBranch($branch)->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->whereNotNull('performing_surgeon')
            ->select('performing_surgeon', DB::raw('COUNT(*) as cnt'))
            ->groupBy('performing_surgeon')->orderByDesc('cnt')->first();
        if ($top) {
            $insights[] = ['icon' => '👨‍⚕️', 'title' => 'Top Surgeon', 'text' => "{$top->performing_surgeon} led with {$top->cnt} surgeries this period.", 'type' => 'info'];
        }

        // Top department
        $topDept = Surgery::forBranch($branch)->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->whereNotNull('surgery_department')
            ->select('surgery_department', DB::raw('COUNT(*) as cnt'))
            ->groupBy('surgery_department')->orderByDesc('cnt')->first();
        if ($topDept) {
            $insights[] = ['icon' => '🏥', 'title' => 'Top Department', 'text' => "{$topDept->surgery_department} performed the most surgeries ({$topDept->cnt}).", 'type' => 'info'];
        }

        return $insights;
    }

    private function addDelta(array &$list, string $title, $curr, $prev, string $label, string $icon, bool $lowerIsBetter = false): void
    {
        if (!$prev) return;
        $delta = $curr - $prev;
        $pct   = round(abs($delta / $prev) * 100, 1);
        $up    = $delta > 0;
        $good  = $lowerIsBetter ? !$up : $up;
        $list[] = [
            'icon'  => $icon,
            'title' => $title,
            'text'  => ($up ? "↑ {$pct}% increase" : "↓ {$pct}% decrease") . " in {$label} vs previous period.",
            'type'  => $good ? 'success' : 'warning',
            'delta' => $delta,
            'pct'   => $pct,
            'current' => $curr,
        ];
    }
}
