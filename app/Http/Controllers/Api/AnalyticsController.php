<?php

namespace App\Http\Controllers\Api;

use App\Enums\Branch;
use App\Http\Controllers\Controller;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\MisReport;
use App\Models\PackageConsumption;
use App\Models\Surgery;
use App\Services\DashboardKpiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function __construct(private DashboardKpiService $kpi) {}

    /**
     * KPI summary cards for a branch on a given date.
     * GET /api/analytics/kpi/{branch}/{date}
     *
     * Every KPI below is calculated live from the reporting database via
     * DashboardKpiService (the same service used by the Dashboard and MIS/BRM
     * reports) — a null value means the source report was never uploaded for
     * this branch+date, and should render as DashboardKpiService::NA_MESSAGE.
     */
    public function kpi(string $branch, string $date): JsonResponse
    {
        try {
            $branchEnum = Branch::from($branch);

            $totalRevenue = $this->kpi->calculateRevenue($branchEnum, $date);

            $totalPatients = BillItem::forBranch($branch)
                ->forDate($date)
                ->saleStatus()
                ->whereNotNull('uhid')
                ->distinct('uhid')
                ->count('uhid');

            $opCount = $this->kpi->calculateOpCount($branchEnum, $date);
            $ipCount = $this->kpi->calculateIpCount($branchEnum, $date);
            $erCount = $this->kpi->calculateErCount($branchEnum, $date);

            $discountAmount = (float) BillItem::forBranch($branch)
                ->forDate($date)
                ->saleStatus()
                ->sum('discount_amount');

            $netCollection      = $this->kpi->calculateCashCollection($branchEnum, $date);
            $packageConsumption = $this->kpi->calculatePackageRevenue($branchEnum, $date);
            $pharmacySales      = $this->kpi->calculatePharmacyRevenue($branchEnum, $date);

            $occupancyPct = $this->kpi->calculateOccupancy($branchEnum, $date);
            $occupancy    = $this->kpi->calculateBedsOccupied($branchEnum, $date);
            $bedCount     = $branchEnum->bedCount();

            $avgRevenuePerPatient = ($totalPatients > 0 && $totalRevenue !== null)
                ? round($totalRevenue / $totalPatients, 2)
                : 0;

            $surgeryCount = Surgery::forBranch($branch)->forDate($date)->count();
            $majorSurgeries = Surgery::forBranch($branch)->forDate($date)
                ->where('surgery_category', 'Major')->count();

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_revenue'           => $totalRevenue,
                    'total_patients'          => $totalPatients,
                    'op_count'                => $opCount,
                    'ip_count'                => $ipCount,
                    'er_count'                => $erCount,
                    'discount_amount'         => $discountAmount,
                    'net_collection'          => $netCollection,
                    'package_consumption'     => $packageConsumption,
                    'pharmacy_sales'          => $pharmacySales,
                    'bed_occupancy_pct'       => $occupancyPct,
                    'bed_occupancy'           => $occupancy,
                    'bed_count'               => $bedCount,
                    'avg_revenue_per_patient' => $avgRevenuePerPatient,
                    'surgery_count'           => $surgeryCount,
                    'major_surgeries'         => $majorSurgeries,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Daily revenue trend for a date range.
     * GET /api/analytics/charts/daily-trend?branch=chromepet&from=2026-06-01&to=2026-06-24
     */
    public function dailyTrend(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $rows = BillItem::select(
                    DB::raw('DATE(bill_date) as day'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('SUM(CASE WHEN patient_type = "OP" THEN net_amount ELSE 0 END) as op_revenue'),
                    DB::raw('SUM(CASE WHEN patient_type = "IP" THEN net_amount ELSE 0 END) as ip_revenue'),
                    DB::raw('SUM(CASE WHEN patient_type = "ER" THEN net_amount ELSE 0 END) as er_revenue'),
                    DB::raw('SUM(CASE WHEN patient_type IS NULL THEN net_amount ELSE 0 END) as ph_revenue')
                )
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->groupBy('day')
                ->orderBy('day')
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Monthly revenue trend.
     * GET /api/analytics/charts/monthly-trend?branch=chromepet&year=2026
     */
    public function monthlyTrend(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $year   = $request->input('year', Carbon::now()->year);

            $rows = BillItem::select(
                    DB::raw('MONTH(bill_date) as month'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )
                ->where('branch', $branch)
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

            return response()->json(['success' => true, 'data' => $months]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Department-wise revenue breakdown.
     * GET /api/analytics/charts/dept-revenue?branch=chromepet&date=2026-06-23
     */
    public function deptRevenue(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);

            $rows = BillItem::select(
                    'treating_department',
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->whereNotNull('treating_department')
                ->where('treating_department', '!=', '')
                ->groupBy('treating_department')
                ->orderByDesc('revenue')
                ->limit(20)
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Payer / payment mode distribution.
     * GET /api/analytics/charts/payer-mix?branch=chromepet&date=2026-06-23
     */
    public function payerMix(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);

            $rows = CashierCollection::select(
                    'payer_type',
                    DB::raw('SUM(paid_amount) as amount'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->where('branch', $branch)
                ->whereDate('collection_date', '>=', $from)->whereDate('collection_date', '<=', $to)
                ->groupBy('payer_type')
                ->orderByDesc('amount')
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * OP vs IP vs ER vs Pharmacy analysis.
     * GET /api/analytics/charts/patient-mix?branch=chromepet&from=...&to=...
     */
    public function patientMix(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $rows = BillItem::select(
                    DB::raw('DATE(bill_date) as day'),
                    DB::raw('SUM(CASE WHEN patient_type = "OP" THEN net_amount ELSE 0 END) as op'),
                    DB::raw('SUM(CASE WHEN patient_type = "IP" THEN net_amount ELSE 0 END) as ip'),
                    DB::raw('SUM(CASE WHEN patient_type = "ER" THEN net_amount ELSE 0 END) as er'),
                    DB::raw('SUM(CASE WHEN patient_type IS NULL THEN net_amount ELSE 0 END) as pharmacy')
                )
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->groupBy('day')
                ->orderBy('day')
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Branch comparison.
     * GET /api/analytics/charts/branch-comparison?from=2026-06-01&to=2026-06-24
     */
    public function branchComparison(Request $request): JsonResponse
    {
        try {
            $from = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to   = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $result = [];
            foreach (Branch::cases() as $branch) {
                $result[$branch->value] = [
                    'label'      => $branch->label(),
                    'revenue'    => (float) BillItem::where('branch', $branch->value)
                                    ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                                    ->saleStatus()
                                    ->sum('net_amount'),
                    'collection' => (float) CashierCollection::where('branch', $branch->value)
                                    ->whereDate('collection_date', '>=', $from)->whereDate('collection_date', '<=', $to)
                                    ->sum('paid_amount'),
                    'patients'   => BillItem::where('branch', $branch->value)
                                    ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                                    ->saleStatus()
                                    ->distinct('uhid')
                                    ->count('uhid'),
                    'surgeries'  => Surgery::where('branch', $branch->value)
                                    ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                                    ->count(),
                ];
            }

            return response()->json(['success' => true, 'data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Doctor-wise revenue.
     * GET /api/analytics/charts/doctor-revenue?branch=chromepet&from=...&to=...
     */
    public function doctorRevenue(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $rows = BillItem::select(
                    'treating_doctor',
                    'treating_doctor_speciality',
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->whereNotNull('treating_doctor')
                ->where('treating_doctor', '!=', '')
                ->groupBy('treating_doctor', 'treating_doctor_speciality')
                ->orderByDesc('revenue')
                ->limit(20)
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Surgery analytics.
     * GET /api/analytics/surgeries?branch=chromepet&from=...&to=...
     */
    public function surgeries(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $byCategory = Surgery::select('surgery_category', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                ->groupBy('surgery_category')
                ->get();

            $byDept = Surgery::select('surgery_department', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                ->whereNotNull('surgery_department')
                ->groupBy('surgery_department')
                ->orderByDesc('count')
                ->limit(10)
                ->get();

            $bySurgeon = Surgery::select('performing_surgeon', 'surgeon_speciality', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                ->whereNotNull('performing_surgeon')
                ->groupBy('performing_surgeon', 'surgeon_speciality')
                ->orderByDesc('count')
                ->limit(10)
                ->get();

            $byPayerType = Surgery::select('payer_type', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)
                ->groupBy('payer_type')
                ->get();

            return response()->json([
                'success' => true,
                'data'    => [
                    'by_category'  => $byCategory,
                    'by_dept'      => $byDept,
                    'by_surgeon'   => $bySurgeon,
                    'by_payer_type'=> $byPayerType,
                    'total'        => Surgery::where('branch', $branch)->whereDate('surgery_date', '>=', $from)->whereDate('surgery_date', '<=', $to)->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Admission analytics (IP + ER).
     * GET /api/analytics/admissions?branch=chromepet&from=...&to=...
     */
    public function admissions(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $ipByPayerType = IpAdmission::select('payer_type', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
                ->groupBy('payer_type')->get();

            $ipByDept = IpAdmission::select('treating_department', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
                ->whereNotNull('treating_department')
                ->groupBy('treating_department')->orderByDesc('count')->limit(10)->get();

            $erByAdmissionType = ErAdmission::select('admission_type', DB::raw('COUNT(*) as count'))
                ->where('branch', $branch)->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
                ->groupBy('admission_type')->get();

            $avgLos = IpAdmission::where('branch', $branch)
                ->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)
                ->whereNotNull('actual_los')
                ->avg('actual_los');

            return response()->json([
                'success' => true,
                'data'    => [
                    'ip_total'          => IpAdmission::where('branch', $branch)->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)->count(),
                    'er_total'          => ErAdmission::where('branch', $branch)->whereDate('admission_date', '>=', $from)->whereDate('admission_date', '<=', $to)->count(),
                    'ip_by_payer_type'  => $ipByPayerType,
                    'ip_by_dept'        => $ipByDept,
                    'er_by_type'        => $erByAdmissionType,
                    'avg_los_days'      => round((float) $avgLos, 2),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * IP patient demographics breakdown.
     * GET /api/analytics/ip-demographics?branch=chromepet&date=2026-06-23
     */
    public function ipDemographics(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);

            // Census query: patients present during the period
            // (admitted on or before $to, and not yet discharged or discharged on/after $from)
            $base = IpAdmission::where('branch', $branch)
                ->whereDate('admission_date', '<=', $to)
                ->where(function ($q) use ($from) {
                    $q->whereNull('discharge_date')
                      ->orWhereDate('discharge_date', '>=', $from);
                });

            $total        = (clone $base)->count();
            $ageBelow18   = (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '<', 18)->count();
            $age18Plus    = (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '>=', 18)->count();
            $mlcCount     = (clone $base)->where('mlc', true)->count();
            $deathCount   = (clone $base)->where('discharge_type', 'like', '%Death%')->count();
            $plannedDischarge = (clone $base)->where('discharge_type', 'like', '%Planned%')->count();

            $byGender = (clone $base)->select(
                    DB::raw('IFNULL(gender, "Unknown") as gender'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('gender')->orderByDesc('count')->get();

            $byPayerType = (clone $base)->select(
                    DB::raw('IFNULL(payer_type, "Unknown") as payer_type'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('payer_type')->orderByDesc('count')->get();

            $byWard = (clone $base)->select(
                    'ward',
                    DB::raw('COUNT(*) as count')
                )->whereNotNull('ward')->where('ward', '!=', '')
                ->groupBy('ward')->orderByDesc('count')->limit(10)->get();

            $bySpeciality = (clone $base)->select(
                    DB::raw('IFNULL(treating_doctor_speciality, "Unknown") as speciality'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('speciality')->orderByDesc('count')->limit(10)->get();

            $bySource = (clone $base)->select(
                    DB::raw('IFNULL(admission_source, "Unknown") as source'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('source')->orderByDesc('count')->get();

            $topDoctors = (clone $base)->select(
                    DB::raw('IFNULL(treating_doctor, "Unknown") as doctor'),
                    DB::raw('IFNULL(treating_doctor_speciality, "") as speciality'),
                    DB::raw('COUNT(*) as count')
                )->whereNotNull('treating_doctor')
                ->groupBy('doctor', 'speciality')->orderByDesc('count')->limit(10)->get();

            $avgLos = (clone $base)->whereNotNull('actual_los')->avg('actual_los');

            return response()->json([
                'success' => true,
                'data'    => [
                    'total'             => $total,
                    'age_below_18'      => $ageBelow18,
                    'age_18_plus'       => $age18Plus,
                    'mlc_count'         => $mlcCount,
                    'death_count'       => $deathCount,
                    'planned_discharge' => $plannedDischarge,
                    'avg_los_days'      => round((float) $avgLos, 1),
                    'by_gender'         => $byGender,
                    'by_payer_type'     => $byPayerType,
                    'by_ward'           => $byWard,
                    'by_speciality'     => $bySpeciality,
                    'by_source'         => $bySource,
                    'top_doctors'       => $topDoctors,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Surgery deep analytics.
     * GET /api/analytics/surgery-detail?branch=chromepet&date=2026-06-23
     */
    public function surgeryDetail(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);

            $base = Surgery::where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)
                ->whereDate('surgery_date', '<=', $to);

            $total       = (clone $base)->count();
            $major       = (clone $base)->where('surgery_category', 'Major')->count();
            $minor       = (clone $base)->where('surgery_category', 'Minor')->count();
            $daySurgery  = (clone $base)->where('ot_surgery_type', 'like', '%Day%')->count();
            $emergency   = (clone $base)->where('ot_surgery_type', 'Emergency')->count();
            $elective    = (clone $base)->where('ot_surgery_type', 'Elective')->count();
            $implant     = (clone $base)->where('implant_required', true)->count();
            $ageBelow18  = (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '<', 18)->count();
            $age18Plus   = (clone $base)->where(DB::raw('CAST(age AS UNSIGNED)'), '>=', 18)->count();

            $byOtRoom = (clone $base)->select(
                    DB::raw('IFNULL(ot_name, "Unknown") as ot_name'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('ot_name')->orderByDesc('count')->get();

            $bySurgeon = (clone $base)->select(
                    DB::raw('IFNULL(performing_surgeon, "Unknown") as surgeon'),
                    DB::raw('IFNULL(surgeon_speciality, "") as speciality'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('surgeon', 'speciality')->orderByDesc('count')->limit(10)->get();

            $byAnaesthetist = (clone $base)->select(
                    DB::raw('IFNULL(component_doctor, "Unknown") as anaesthetist'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('anaesthetist')->orderByDesc('count')->limit(10)->get();

            $byDept = (clone $base)->select(
                    DB::raw('IFNULL(surgery_department, "Unknown") as dept'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('dept')->orderByDesc('count')->limit(10)->get();

            $byPayerType = (clone $base)->select(
                    DB::raw('IFNULL(payer_type, "Unknown") as payer_type'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('payer_type')->orderByDesc('count')->get();

            $byAnaesthesiaType = (clone $base)->select(
                    DB::raw('IFNULL(anaesthesia_type, "Unknown") as anaesthesia_type'),
                    DB::raw('COUNT(*) as count')
                )->groupBy('anaesthesia_type')->orderByDesc('count')->get();

            return response()->json([
                'success' => true,
                'data'    => [
                    'total'              => $total,
                    'major'              => $major,
                    'minor'              => $minor,
                    'day_surgery'        => $daySurgery,
                    'emergency'          => $emergency,
                    'elective'           => $elective,
                    'implant'            => $implant,
                    'age_below_18'       => $ageBelow18,
                    'age_18_plus'        => $age18Plus,
                    'by_ot_room'         => $byOtRoom,
                    'by_surgeon'         => $bySurgeon,
                    'by_anaesthetist'    => $byAnaesthetist,
                    'by_dept'            => $byDept,
                    'by_payer_type'      => $byPayerType,
                    'by_anaesthesia_type'=> $byAnaesthesiaType,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Collection analytics — payment mode breakdown and cashier performance.
     * GET /api/analytics/collection?branch=chromepet&from=...&to=...
     */
    public function collectionReport(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $base = CashierCollection::where('branch', $branch)
                ->whereDate('collection_date', '>=', $from)
                ->whereDate('collection_date', '<=', $to);

            $totalCollection = (clone $base)->sum('paid_amount');

            // Collection by patient type
            $byPatientType = (clone $base)->select(
                    DB::raw('IFNULL(patient_type, "Other") as patient_type'),
                    DB::raw('SUM(paid_amount) as amount'),
                    DB::raw('COUNT(*) as transactions')
                )->groupBy('patient_type')->orderByDesc('amount')->get();

            // Collection by transaction category (Settlement vs Deposit)
            $byCategory = (clone $base)->select(
                    DB::raw('IFNULL(transaction_category, "Other") as category'),
                    DB::raw('SUM(paid_amount) as amount'),
                    DB::raw('COUNT(*) as transactions')
                )->groupBy('category')->orderByDesc('amount')->get();

            // Payment mode grouping (parse the payment_mode string)
            $modeRows = (clone $base)->select('payment_mode', DB::raw('SUM(paid_amount) as amount'))
                ->whereNotNull('payment_mode')
                ->groupBy('payment_mode')
                ->get();

            $modeGrouped = [
                'Cash'          => 0,
                'POS / Card'    => 0,
                'UPI / Digital' => 0,
                'NEFT / RTGS'   => 0,
                'TPA / Insurance'=> 0,
                'Corporate'     => 0,
                'Other'         => 0,
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

            // Daily collection trend
            $dailyTrend = (clone $base)->select(
                    DB::raw('DATE(collection_date) as day'),
                    DB::raw('SUM(paid_amount) as amount'),
                    DB::raw('COUNT(*) as transactions')
                )->groupBy('day')->orderBy('day')->get();

            // Payer type breakdown
            $byPayerType = (clone $base)->select(
                    DB::raw('IFNULL(payer_type, "other") as payer_type'),
                    DB::raw('SUM(paid_amount) as amount'),
                    DB::raw('COUNT(*) as transactions')
                )->groupBy('payer_type')->orderByDesc('amount')->get();

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_collection'  => (float) $totalCollection,
                    'by_patient_type'   => $byPatientType,
                    'by_category'       => $byCategory,
                    'payment_modes'     => $paymentModes,
                    'daily_trend'       => $dailyTrend,
                    'by_payer_type'     => $byPayerType,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Service type revenue breakdown.
     * GET /api/analytics/service-revenue?branch=chromepet&from=...&to=...
     */
    public function serviceRevenue(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            $base = BillItem::where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)
                ->whereDate('bill_date', '<=', $to)
                ->saleStatus();

            // Revenue by service type
            $byServiceType = (clone $base)->select(
                    DB::raw('IFNULL(service_type, "Other") as service_type'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('SUM(discount_amount) as discount'),
                    DB::raw('COUNT(*) as transactions'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )->whereNotNull('service_type')
                ->where('service_type', '!=', '')
                ->groupBy('service_type')
                ->orderByDesc('revenue')
                ->get();

            // Revenue by patient type (ER/IP/OP)
            $byPatientType = (clone $base)->select(
                    DB::raw('IFNULL(patient_type, "Other") as patient_type'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )->groupBy('patient_type')->orderByDesc('revenue')->get();

            // Top service items
            $topItems = (clone $base)->select(
                    'service_item_name',
                    'service_type',
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('SUM(quantity) as qty')
                )->whereNotNull('service_item_name')
                ->where('service_item_name', '!=', '')
                ->groupBy('service_item_name', 'service_type')
                ->orderByDesc('revenue')
                ->limit(20)
                ->get();

            // Department-wise service revenue
            $byDepartment = (clone $base)->select(
                    DB::raw('IFNULL(treating_department, "Other") as department'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )->whereNotNull('treating_department')
                ->where('treating_department', '!=', '')
                ->groupBy('department')
                ->orderByDesc('revenue')
                ->limit(15)
                ->get();

            // Payer type revenue
            $byPayerType = (clone $base)->select(
                    DB::raw('IFNULL(payer_type, "other") as payer_type'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )->groupBy('payer_type')->orderByDesc('revenue')->get();

            $totalRevenue  = (clone $base)->sum('net_amount');
            $totalDiscount = (clone $base)->sum('discount_amount');

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_revenue'   => (float) $totalRevenue,
                    'total_discount'  => (float) $totalDiscount,
                    'by_service_type' => $byServiceType,
                    'by_patient_type' => $byPatientType,
                    'top_items'       => $topItems,
                    'by_department'   => $byDepartment,
                    'by_payer_type'   => $byPayerType,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Comprehensive doctor performance report.
     * GET /api/analytics/doctor-performance?branch=chromepet&from=...&to=...
     */
    public function doctorPerformance(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));

            // Doctor revenue from bill items
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
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)
                ->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->whereNotNull('treating_doctor')
                ->where('treating_doctor', '!=', '')
                ->groupBy('treating_doctor', 'treating_doctor_speciality')
                ->orderByDesc('total_revenue')
                ->get();

            // Doctor IP admission counts
            $ipCounts = IpAdmission::select(
                    'treating_doctor',
                    DB::raw('COUNT(*) as ip_admissions'),
                    DB::raw('AVG(actual_los) as avg_los')
                )
                ->where('branch', $branch)
                ->whereDate('admission_date', '>=', $from)
                ->whereDate('admission_date', '<=', $to)
                ->whereNotNull('treating_doctor')
                ->groupBy('treating_doctor')
                ->get()
                ->keyBy('treating_doctor');

            // Doctor ER counts
            $erCounts = ErAdmission::select(
                    'doctor_name',
                    DB::raw('COUNT(*) as er_admissions')
                )
                ->where('branch', $branch)
                ->whereDate('admission_date', '>=', $from)
                ->whereDate('admission_date', '<=', $to)
                ->whereNotNull('doctor_name')
                ->groupBy('doctor_name')
                ->get()
                ->keyBy('doctor_name');

            // Doctor surgery counts
            $surgCounts = Surgery::select(
                    'performing_surgeon',
                    DB::raw('COUNT(*) as surgeries'),
                    DB::raw('COUNT(CASE WHEN surgery_category="Major" THEN 1 END) as major_surgeries')
                )
                ->where('branch', $branch)
                ->whereDate('surgery_date', '>=', $from)
                ->whereDate('surgery_date', '<=', $to)
                ->whereNotNull('performing_surgeon')
                ->groupBy('performing_surgeon')
                ->get()
                ->keyBy('performing_surgeon');

            // Merge all data
            $merged = $doctorRevenue->map(function ($row) use ($ipCounts, $erCounts, $surgCounts) {
                $doctor    = $row->treating_doctor;
                $ipData    = $ipCounts->get($doctor);
                $erData    = $erCounts->get($doctor);
                $surgData  = $surgCounts->get($doctor);
                return [
                    'doctor'             => $doctor,
                    'speciality'         => $row->treating_doctor_speciality,
                    'total_revenue'      => (float) $row->total_revenue,
                    'total_discount'     => (float) $row->total_discount,
                    'unique_patients'    => (int) $row->unique_patients,
                    'visit_count'        => (int) $row->visit_count,
                    'op_revenue'         => (float) $row->op_revenue,
                    'ip_revenue'         => (float) $row->ip_revenue,
                    'er_revenue'         => (float) $row->er_revenue,
                    'op_count'           => (int) $row->op_count,
                    'ip_count'           => (int) $row->ip_count,
                    'er_count'           => (int) $row->er_count,
                    'ip_admissions'      => (int) ($ipData?->ip_admissions ?? 0),
                    'avg_los'            => round((float) ($ipData?->avg_los ?? 0), 1),
                    'er_admissions'      => (int) ($erData?->er_admissions ?? 0),
                    'surgeries'          => (int) ($surgData?->surgeries ?? 0),
                    'major_surgeries'    => (int) ($surgData?->major_surgeries ?? 0),
                ];
            });

            // Speciality summary
            $bySpeciality = BillItem::select(
                    DB::raw('IFNULL(treating_doctor_speciality, "Other") as speciality'),
                    DB::raw('SUM(net_amount) as revenue'),
                    DB::raw('COUNT(DISTINCT treating_doctor) as doctors'),
                    DB::raw('COUNT(DISTINCT uhid) as patients')
                )
                ->where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)
                ->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->whereNotNull('treating_doctor_speciality')
                ->where('treating_doctor_speciality', '!=', '')
                ->groupBy('speciality')
                ->orderByDesc('revenue')
                ->limit(15)
                ->get();

            return response()->json([
                'success' => true,
                'data'    => [
                    'doctors'       => $merged->values(),
                    'by_speciality' => $bySpeciality,
                    'total_doctors' => $merged->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * OP doctor-wise visit count and payer breakdown from bill_items.
     * GET /api/analytics/op-metrics?branch=chromepet&date=2026-06-23
     */
    public function opMetrics(Request $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);

            $base = BillItem::where('branch', $branch)
                ->whereDate('bill_date', '>=', $from)
                ->whereDate('bill_date', '<=', $to)
                ->saleStatus()
                ->where('patient_type', 'OP');

            $totalVisits   = (clone $base)->distinct('visit_id')->count('visit_id');
            $uniquePatients = (clone $base)->distinct('uhid')->count('uhid');

            $byGender = (clone $base)->select(
                    DB::raw('IFNULL(gender, "Unknown") as gender'),
                    DB::raw('COUNT(DISTINCT visit_id) as visits')
                )->groupBy('gender')->orderByDesc('visits')->get();

            $byPayerType = (clone $base)->select(
                    DB::raw('IFNULL(payer_type, "Unknown") as payer_type'),
                    DB::raw('COUNT(DISTINCT visit_id) as visits'),
                    DB::raw('SUM(net_amount) as revenue')
                )->groupBy('payer_type')->orderByDesc('visits')->get();

            $topDoctors = (clone $base)->select(
                    DB::raw('IFNULL(treating_doctor, "Unknown") as doctor'),
                    DB::raw('IFNULL(treating_doctor_speciality, "") as speciality'),
                    DB::raw('COUNT(DISTINCT visit_id) as visits'),
                    DB::raw('SUM(net_amount) as revenue')
                )->whereNotNull('treating_doctor')
                ->groupBy('doctor', 'speciality')->orderByDesc('visits')->limit(10)->get();

            $byDept = (clone $base)->select(
                    DB::raw('IFNULL(treating_department, "Unknown") as dept'),
                    DB::raw('COUNT(DISTINCT visit_id) as visits'),
                    DB::raw('SUM(net_amount) as revenue')
                )->groupBy('dept')->orderByDesc('visits')->limit(10)->get();

            $totalRevenue = (clone $base)->sum('net_amount');
            $totalDiscount = (clone $base)->sum('discount_amount');

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_visits'    => $totalVisits,
                    'unique_patients' => $uniquePatients,
                    'total_revenue'   => (float) $totalRevenue,
                    'total_discount'  => (float) $totalDiscount,
                    'by_gender'       => $byGender,
                    'by_payer_type'   => $byPayerType,
                    'top_doctors'     => $topDoctors,
                    'by_dept'         => $byDept,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
