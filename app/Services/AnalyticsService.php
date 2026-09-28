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

    public function dailyTrend($branch, string $from, string $to, array $filters = []): Collection
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

    public function monthlyTrend($branch, int $year, array $filters = []): array
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

    public function deptRevenue($branch, string $from, string $to, array $filters = []): Collection
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

    public function payerMix($branch, string $from, string $to, array $filters = []): Collection
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

    public function patientMix($branch, string $from, string $to, array $filters = []): Collection
    {
        return BillItem::select(
            DB::raw('DATE(bill_date) as day'),
            DB::raw('SUM(CASE WHEN patient_type = "OP" THEN net_amount ELSE 0 END) as op'),
            DB::raw('SUM(CASE WHEN patient_type = "IP" THEN net_amount ELSE 0 END) as ip'),
            DB::raw('SUM(CASE WHEN patient_type = "ER" THEN net_amount ELSE 0 END) as er'),
            DB::raw('SUM(CASE WHEN patient_type IS NULL THEN net_amount ELSE 0 END) as pharmacy')
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
        $result = [];
        foreach (Branch::cases() as $branch) {
            $result[$branch->value] = [
                'label'      => $branch->label(),
                'revenue'    => (float) BillItem::where('branch', $branch->value)
                    ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                    ->saleStatus()->sum('net_amount'),
                'collection' => (float) CashierCollection::where('branch', $branch->value)
                    ->whereDate('collection_date', '>=', $from)->whereDate('collection_date', '<=', $to)
                    ->sum('paid_amount'),
                'patients'   => BillItem::where('branch', $branch->value)
                    ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                    ->saleStatus()->distinct('uhid')->count('uhid'),
                'surgeries'  => Surgery::where('branch', $branch->value)
                    ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                    ->count(),
            ];
        }

        return $result;
    }

    // ─── Doctor revenue ───────────────────────────────────────────────────────

    public function doctorRevenue($branch, string $from, string $to, array $filters = []): Collection
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

    public function surgeries($branch, string $from, string $to, array $filters = []): array
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

    // ─── Admissions ───────────────────────────────────────────────────────────

    public function admissions($branch, string $from, string $to, array $filters = []): array
    {
        $ipBase = IpAdmission::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to);
        $erBase = ErAdmission::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to);

        return [
            'ip_total'         => (clone $ipBase)->count(),
            'er_total'         => (clone $erBase)->count(),
            'ip_by_payer_type' => (clone $ipBase)->select('payer_type', DB::raw('COUNT(*) as count'))
                ->groupBy('payer_type')->get(),
            'ip_by_dept'       => (clone $ipBase)->select('treating_department', DB::raw('COUNT(*) as count'))
                ->whereNotNull('treating_department')
                ->groupBy('treating_department')->orderByDesc('count')->limit(10)->get(),
            'er_by_type'       => (clone $erBase)->select('admission_type', DB::raw('COUNT(*) as count'))
                ->groupBy('admission_type')->get(),
            'avg_los_days'     => round((float) (clone $ipBase)->whereNotNull('actual_los')->avg('actual_los'), 2),
        ];
    }

    // ─── IP demographics ──────────────────────────────────────────────────────

    public function ipDemographics($branch, string $from, string $to, array $filters = []): array
    {
        $base = IpAdmission::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '<=', $to)
            ->where(function ($q) use ($from) {
                $q->whereNull('discharge_date')
                    ->orWhereDate('discharge_date', '>', $from);
            });

        return [
            'total'             => (clone $base)->count(),
            'age_below_18'      => (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '<', 18)->count(),
            'age_18_plus'       => (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '>=', 18)->count(),
            'mlc_count'         => (clone $base)->where('mlc', true)->count(),
            'death_count'       => (clone $base)->where('discharge_type', 'like', '%Death%')->count(),
            'planned_discharge' => (clone $base)->where('discharge_type', 'like', '%Planned%')->count(),
            'discharge_count'   => (clone $base)->whereNotNull('discharge_date')
                ->whereDate('discharge_date', '>=', $from)
                ->whereDate('discharge_date', '<=', $to)->count(),
            'avg_los_days'      => round((float) (clone $base)->whereNotNull('actual_los')->avg('actual_los'), 1),
            'by_gender'         => (clone $base)->select(DB::raw('IFNULL(gender, "Unknown") as gender'), DB::raw('COUNT(*) as count'))
                ->groupBy('gender')->orderByDesc('count')->get(),
            'by_payer_type'     => (clone $base)->select(DB::raw('IFNULL(payer_type, "Unknown") as payer_type'), DB::raw('COUNT(*) as count'))
                ->groupBy('payer_type')->orderByDesc('count')->get(),
            'by_ward'           => (clone $base)->select('ward', DB::raw('COUNT(*) as count'))
                ->whereNotNull('ward')->where('ward', '!=', '')
                ->groupBy('ward')->orderByDesc('count')->limit(10)->get(),
            'by_room'           => (clone $base)->select(DB::raw('IFNULL(room, "Unknown") as room'), DB::raw('COUNT(*) as count'))
                ->whereNotNull('room')->where('room', '!=', '')
                ->groupBy('room')->orderByDesc('count')->limit(10)->get(),
            'by_speciality'     => (clone $base)->select(DB::raw('IFNULL(treating_doctor_speciality, "Unknown") as speciality'), DB::raw('COUNT(*) as count'))
                ->groupBy('speciality')->orderByDesc('count')->limit(10)->get(),
            'by_source'         => (clone $base)->select(DB::raw('IFNULL(admission_source, "Unknown") as source'), DB::raw('COUNT(*) as count'))
                ->groupBy('source')->orderByDesc('count')->get(),
            'by_discharge_type' => (clone $base)->select(DB::raw('IFNULL(discharge_type, "Unknown") as discharge_type'), DB::raw('COUNT(*) as count'))
                ->whereNotNull('discharge_type')->groupBy('discharge_type')->orderByDesc('count')->get(),
            'top_doctors'       => (clone $base)->select(
                DB::raw('IFNULL(treating_doctor, "Unknown") as doctor'),
                DB::raw('IFNULL(treating_doctor_speciality, "") as speciality'),
                DB::raw('COUNT(*) as count')
            )->whereNotNull('treating_doctor')
                ->groupBy('doctor', 'speciality')->orderByDesc('count')->limit(10)->get(),
        ];
    }

    // ─── Surgery detail ───────────────────────────────────────────────────────

    public function surgeryDetail($branch, string $from, string $to, array $filters = []): array
    {
        $base = Surgery::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)
            ->whereDate('surgery_date', '<=', $to);

        return [
            'total'              => (clone $base)->count(),
            'major'              => (clone $base)->where('surgery_category', 'Major')->count(),
            'minor'              => (clone $base)->where('surgery_category', 'Minor')->count(),
            'day_surgery'        => (clone $base)->where('ot_surgery_type', 'like', '%Day%')->count(),
            'emergency'          => (clone $base)->where('ot_surgery_type', 'Emergency')->count(),
            'elective'           => (clone $base)->where('ot_surgery_type', 'Elective')->count(),
            'implant'            => (clone $base)->where('implant_required', true)->count(),
            'age_below_18'       => (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '<', 18)->count(),
            'age_18_plus'        => (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '>=', 18)->count(),
            'by_ot_room'         => (clone $base)->select(DB::raw('IFNULL(ot_name, "Unknown") as ot_name'), DB::raw('COUNT(*) as count'))
                ->groupBy('ot_name')->orderByDesc('count')->get(),
            'by_surgeon'         => (clone $base)->select(
                DB::raw('IFNULL(performing_surgeon, "Unknown") as surgeon'),
                DB::raw('IFNULL(surgeon_speciality, "") as speciality'),
                DB::raw('COUNT(*) as count')
            )->groupBy('surgeon', 'speciality')->orderByDesc('count')->limit(10)->get(),
            'by_anaesthetist'    => (clone $base)->select(DB::raw('IFNULL(component_doctor, "Unknown") as anaesthetist'), DB::raw('COUNT(*) as count'))
                ->groupBy('anaesthetist')->orderByDesc('count')->limit(10)->get(),
            'by_dept'            => (clone $base)->select(DB::raw('IFNULL(surgery_department, "Unknown") as dept'), DB::raw('COUNT(*) as count'))
                ->groupBy('dept')->orderByDesc('count')->limit(10)->get(),
            'by_payer_type'      => (clone $base)->select(DB::raw('IFNULL(payer_type, "Unknown") as payer_type'), DB::raw('COUNT(*) as count'))
                ->groupBy('payer_type')->orderByDesc('count')->get(),
            'by_anaesthesia_type' => (clone $base)->select(DB::raw('IFNULL(anaesthesia_type, "Unknown") as anaesthesia_type'), DB::raw('COUNT(*) as count'))
                ->groupBy('anaesthesia_type')->orderByDesc('count')->get(),
        ];
    }

    // ─── Collection report ────────────────────────────────────────────────────

    public function collectionReport($branch, string $from, string $to, array $filters = []): array
    {
        $base = CashierCollection::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('collection_date', '>=', $from)
            ->whereDate('collection_date', '<=', $to);

        $modeRows = (clone $base)->select('payment_mode', DB::raw('SUM(paid_amount) as amount'))
            ->whereNotNull('payment_mode')
            ->groupBy('payment_mode')
            ->get();

        $modeGrouped = [
            'Cash'           => 0,
            'POS / Card'     => 0,
            'UPI / Digital'  => 0,
            'NEFT / RTGS'    => 0,
            'TPA / Insurance' => 0,
            'Corporate'      => 0,
            'Other'          => 0,
        ];
        foreach ($modeRows as $row) {
            $mode = strtoupper($row->payment_mode ?? '');
            $amt  = (float) $row->amount;
            if (str_contains($mode, 'CASH') || str_contains($mode, 'CHEQUE') || str_contains($mode, 'DD')) {
                $modeGrouped['Cash'] += $amt;
            } elseif (str_contains($mode, 'POS') || str_contains($mode, 'CREDIT') || str_contains($mode, 'DEBIT') || str_contains($mode, 'CARD') || str_contains($mode, 'PINE') || str_contains($mode, 'SWIPE')) {
                $modeGrouped['POS / Card'] += $amt;
            } elseif (str_contains($mode, 'UPI') || str_contains($mode, 'GOOGLE') || str_contains($mode, 'PHONE') || str_contains($mode, 'PAYTM') || str_contains($mode, 'BHIM') || str_contains($mode, 'RAZORPAY')) {
                $modeGrouped['UPI / Digital'] += $amt;
            } elseif (str_contains($mode, 'NEFT') || str_contains($mode, 'RTGS') || str_contains($mode, 'IMPS')) {
                $modeGrouped['NEFT / RTGS'] += $amt;
            } elseif (str_contains($mode, 'TPA') || str_contains($mode, 'INSURANCE')) {
                $modeGrouped['TPA / Insurance'] += $amt;
            } elseif (str_contains($mode, 'CORPORATE')) {
                $modeGrouped['Corporate'] += $amt;
            } else {
                $modeGrouped['Other'] += $amt;
            }
        }

        $paymentModes = collect($modeGrouped)
            ->map(fn($v, $k) => ['mode' => $k, 'amount' => round($v, 2)])
            ->values()
            ->filter(fn($r) => $r['amount'] > 0)
            ->sortByDesc('amount')
            ->values();

        return [
            'total_collection' => (float) (clone $base)->sum('paid_amount'),
            'by_patient_type'  => (clone $base)->select(
                DB::raw('IFNULL(patient_type, "Other") as patient_type'),
                DB::raw('SUM(paid_amount) as amount'),
                DB::raw('COUNT(*) as transactions')
            )->groupBy('patient_type')->orderByDesc('amount')->get(),
            'by_category'      => (clone $base)->select(
                DB::raw('IFNULL(transaction_category, "Other") as category'),
                DB::raw('SUM(paid_amount) as amount'),
                DB::raw('COUNT(*) as transactions')
            )->groupBy('category')->orderByDesc('amount')->get(),
            'payment_modes'    => $paymentModes,
            'daily_trend'      => (clone $base)->select(
                DB::raw('DATE(collection_date) as day'),
                DB::raw('SUM(paid_amount) as amount'),
                DB::raw('COUNT(*) as transactions')
            )->groupBy('day')->orderBy('day')->get(),
            'by_payer_type'    => (clone $base)->select(
                DB::raw('IFNULL(payer_type, "other") as payer_type'),
                DB::raw('SUM(paid_amount) as amount'),
                DB::raw('COUNT(*) as transactions')
            )->groupBy('payer_type')->orderByDesc('amount')->get(),
        ];
    }

    // ─── Service revenue ──────────────────────────────────────────────────────

    public function serviceRevenue($branch, string $from, string $to, array $filters = []): array
    {
        $base = BillItem::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)
            ->whereDate('bill_date', '<=', $to)
            ->saleStatus();

        return [
            'total_revenue'   => (float) (clone $base)->sum('net_amount'),
            'total_discount'  => (float) (clone $base)->sum('discount_amount'),
            'by_service_type' => (clone $base)->select(
                DB::raw('IFNULL(service_type, "Other") as service_type'),
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('SUM(discount_amount) as discount'),
                DB::raw('COUNT(*) as transactions'),
                DB::raw('COUNT(DISTINCT uhid) as patients')
            )->whereNotNull('service_type')->where('service_type', '!=', '')
                ->groupBy('service_type')->orderByDesc('revenue')->get(),
            'by_patient_type' => (clone $base)->select(
                DB::raw('IFNULL(patient_type, "Other") as patient_type'),
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('COUNT(DISTINCT uhid) as patients')
            )->groupBy('patient_type')->orderByDesc('revenue')->get(),
            'top_items'       => (clone $base)->select(
                'service_item_name',
                'service_type',
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('SUM(quantity) as quantity'),
                DB::raw('COUNT(*) as transactions')
            )->whereNotNull('service_item_name')->where('service_item_name', '!=', '')
                ->groupBy('service_item_name', 'service_type')->orderByDesc('revenue')->limit(20)->get(),
            'by_department'   => (clone $base)->select(
                DB::raw('IFNULL(treating_department, "Other") as department'),
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('COUNT(DISTINCT uhid) as patients')
            )->whereNotNull('treating_department')->where('treating_department', '!=', '')
                ->groupBy('department')->orderByDesc('revenue')->limit(15)->get(),
            'by_payer_type'   => (clone $base)->select(
                DB::raw('IFNULL(payer_type, "other") as payer_type'),
                DB::raw('SUM(net_amount) as revenue'),
                DB::raw('COUNT(DISTINCT uhid) as patients')
            )->groupBy('payer_type')->orderByDesc('revenue')->get(),
        ];
    }

    // ─── Doctor performance ───────────────────────────────────────────────────

    public function doctorPerformance($branch, string $from, string $to, array $filters = []): array
    {
        $doctorRevenue = BillItem::select(
            'treating_doctor',
            'treating_doctor_speciality',
            DB::raw('SUM(net_amount) as total_revenue'),
            DB::raw('SUM(discount_amount) as total_discount'),
            DB::raw('COUNT(DISTINCT uhid) as unique_patients'),
            DB::raw('COUNT(DISTINCT visit_id) as visit_count'),
            DB::raw('SUM(CASE WHEN patient_type="OP" THEN net_amount ELSE 0 END) as op_revenue'),
            DB::raw('SUM(CASE WHEN patient_type="IP" THEN net_amount ELSE 0 END) as ip_revenue'),
            DB::raw('SUM(CASE WHEN patient_type="ER" THEN net_amount ELSE 0 END) as er_revenue'),
            DB::raw('COUNT(CASE WHEN patient_type="OP" THEN 1 END) as op_count'),
            DB::raw('COUNT(CASE WHEN patient_type="IP" THEN 1 END) as ip_count'),
            DB::raw('COUNT(CASE WHEN patient_type="ER" THEN 1 END) as er_count')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_doctor')->where('treating_doctor', '!=', '')
            ->groupBy('treating_doctor', 'treating_doctor_speciality')
            ->orderByDesc('total_revenue')
            ->get();

        $ipCounts = IpAdmission::select('treating_doctor', DB::raw('COUNT(*) as ip_admissions'), DB::raw('AVG(actual_los) as avg_los'))
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('treating_doctor')
            ->groupBy('treating_doctor')
            ->get()->keyBy('treating_doctor');

        $erCounts = ErAdmission::select('doctor_name', DB::raw('COUNT(*) as er_admissions'))
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
            ->whereNotNull('doctor_name')
            ->groupBy('doctor_name')
            ->get()->keyBy('doctor_name');

        $surgCounts = Surgery::select('performing_surgeon', DB::raw('COUNT(*) as surgeries'), DB::raw('COUNT(CASE WHEN surgery_category="Major" THEN 1 END) as major_surgeries'))
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
            ->whereNotNull('performing_surgeon')
            ->groupBy('performing_surgeon')
            ->get()->keyBy('performing_surgeon');

        $doctors = $doctorRevenue->map(function ($row) use ($ipCounts, $erCounts, $surgCounts) {
            $doctor   = $row->treating_doctor;
            $ipData   = $ipCounts->get($doctor);
            $erData   = $erCounts->get($doctor);
            $surgData = $surgCounts->get($doctor);
            return [
                'doctor'          => $doctor,
                'speciality'      => $row->treating_doctor_speciality,
                'total_revenue'   => (float) $row->total_revenue,
                'total_discount'  => (float) $row->total_discount,
                'unique_patients' => (int) $row->unique_patients,
                'visit_count'     => (int) $row->visit_count,
                'op_revenue'      => (float) $row->op_revenue,
                'ip_revenue'      => (float) $row->ip_revenue,
                'er_revenue'      => (float) $row->er_revenue,
                'op_count'        => (int) $row->op_count,
                'ip_count'        => (int) $row->ip_count,
                'er_count'        => (int) $row->er_count,
                'ip_admissions'   => (int) ($ipData?->ip_admissions ?? 0),
                'avg_los'         => round((float) ($ipData?->avg_los ?? 0), 1),
                'er_admissions'   => (int) ($erData?->er_admissions ?? 0),
                'surgeries'       => (int) ($surgData?->surgeries ?? 0),
                'major_surgeries' => (int) ($surgData?->major_surgeries ?? 0),
            ];
        });

        $bySpeciality = BillItem::select(
            DB::raw('IFNULL(treating_doctor_speciality, "Other") as speciality'),
            DB::raw('SUM(net_amount) as revenue'),
            DB::raw('COUNT(DISTINCT treating_doctor) as doctors'),
            DB::raw('COUNT(DISTINCT uhid) as patients')
        )
            ->forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->whereNotNull('treating_doctor_speciality')->where('treating_doctor_speciality', '!=', '')
            ->groupBy('speciality')->orderByDesc('revenue')->limit(15)->get();

        return [
            'doctors'       => $doctors->values(),
            'by_speciality' => $bySpeciality,
            'total_doctors' => $doctors->count(),
        ];
    }

    // ─── OP metrics ───────────────────────────────────────────────────────────

    public function opMetrics($branch, string $from, string $to, array $filters = []): array
    {
        $base = BillItem::forBranch($branch)
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
            ->saleStatus()
            ->where('patient_type', 'OP');

        return [
            'total_visits'    => (clone $base)->distinct('visit_id')->count('visit_id'),
            'unique_patients' => (clone $base)->distinct('uhid')->count('uhid'),
            'total_revenue'   => (float) (clone $base)->sum('net_amount'),
            'total_discount'  => (float) (clone $base)->sum('discount_amount'),
            'by_gender'       => (clone $base)->select(DB::raw('IFNULL(gender, "Unknown") as gender'), DB::raw('COUNT(DISTINCT visit_id) as visits'))
                ->groupBy('gender')->orderByDesc('visits')->get(),
            'by_payer_type'   => (clone $base)->select(DB::raw('IFNULL(payer_type, "Unknown") as payer_type'), DB::raw('COUNT(DISTINCT visit_id) as visits'), DB::raw('SUM(net_amount) as revenue'))
                ->groupBy('payer_type')->orderByDesc('visits')->get(),
            'top_doctors'     => (clone $base)->select(
                DB::raw('IFNULL(treating_doctor, "Unknown") as doctor'),
                DB::raw('IFNULL(treating_doctor_speciality, "") as speciality'),
                DB::raw('COUNT(DISTINCT visit_id) as visits'),
                DB::raw('SUM(net_amount) as revenue')
            )->whereNotNull('treating_doctor')
                ->groupBy('doctor', 'speciality')->orderByDesc('visits')->limit(10)->get(),
            'by_dept'         => (clone $base)->select(DB::raw('IFNULL(treating_department, "Unknown") as dept'), DB::raw('COUNT(DISTINCT visit_id) as visits'), DB::raw('SUM(net_amount) as revenue'))
                ->groupBy('dept')->orderByDesc('visits')->limit(10)->get(),
        ];
    }
}
