<?php

namespace App\Http\Controllers\Api;

use App\DTOs\KpiData;
use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Http\Resources\KpiResource;
use App\Models\BillItem;
use App\Models\HospitalBranch;
use App\Models\Surgery;
use Illuminate\Support\Facades\DB;
use App\Services\AnalyticsService;
use App\Services\AnalyticsFilterService;
use App\Services\DashboardKpiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    public function __construct(
        private DashboardKpiService $kpi,
        private AnalyticsService $analytics,
        private AnalyticsFilterService $filterOptions,
    ) {}

    public function filterOptions(AnalyticsRequest $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->filterOptions->options($request->branches(), $request->user()),
        ]);
    }

    private function parseBranches(string|array|null $branchParam): array|string
    {
        if (empty($branchParam) || $branchParam === 'all') return 'all';
        if (is_array($branchParam)) {
            return in_array('all', $branchParam, true) ? 'all' : $branchParam;
        }
        return explode(',', $branchParam);
    }

    public function kpi(AnalyticsRequest $request, string $branch, string $date): JsonResponse
    {
        try {
            $branches = $this->parseBranches($branch);
            $filters  = $request->filters();
            $from     = $request->validated('from', $date);
            $to       = $request->validated('to', $date);

            // Normalize to array if 'all' is passed
            $branchList = $branches === 'all'
                ? HospitalBranch::query()->where('is_active', true)->pluck('key')->all()
                : (array) $branches;

            $totalRevenue = 0;
            $totalPatients = 0;
            $opCount = 0;
            $ipCount = 0;
            $dischargeCount = 0;
            $erCount = 0;
            $discountAmount = 0;
            $netCollection = 0;
            $packageConsumption = 0;
            $pharmacySales = 0;
            $bedOccupancyPct = 0;
            $bedOccupancy = 0;
            $bedCount = 0;
            $avgRevenuePerPatient = 0;
            $surgeryCount = 0;
            $majorSurgeries = 0;

            // Preload bed counts for all branches to avoid querying inside the loop
            $bedCounts = HospitalBranch::query()
                ->whereIn('key', $branchList)
                ->where('is_active', true)
                ->pluck('bed_count', 'key')
                ->all();

            // Aggregate surgery counts per branch in one query to avoid repeated queries
            $surgeryStats = Surgery::forBranch($branchList)
                ->whereBetween('surgery_date', [$from, $to])
                ->applyFilters($filters)
                ->select('branch', DB::raw('COUNT(*) as total'), DB::raw("SUM(CASE WHEN surgery_category = 'Major' THEN 1 ELSE 0 END) as major"))
                ->groupBy('branch')
                ->get()
                ->keyBy('branch');

            foreach ($branchList as $bKey) {
                $totalRevenue += (float) $this->kpi->calculateRevenue($bKey, $from, $to, $filters);

                $totalPatients += BillItem::forBranch($bKey)
                    ->whereBetween('bill_date', [$from, $to])
                    ->applyFilters($filters)->saleStatus()->whereNotNull('uhid')->distinct('uhid')->count('uhid');

                $opCount += (int) $this->kpi->calculateOpCount($bKey, $from, $to, $filters);
                $ipCount += (int) $this->kpi->calculateIpCount($bKey, $from, $to, null, $filters);
                $dischargeCount += (int) $this->kpi->calculateDischarges($bKey, $from, $to);
                $erCount += (int) $this->kpi->calculateErCount($bKey, $from, $to, null, $filters);

                $discountAmount += (float) BillItem::forBranch($bKey)->whereBetween('bill_date', [$from, $to])
                    ->applyFilters($filters)->saleStatus()->sum('discount_amount');

                $netCollection      += (float) $this->kpi->calculateCashCollection($bKey, $from, $to, $filters);
                $packageConsumption += (float) $this->kpi->calculatePackageRevenue($bKey, $from, $to, $filters);
                $pharmacySales      += (float) $this->kpi->calculatePharmacyRevenue($bKey, $from, $to, $filters);
                $bedOccupancy       += (int) $this->kpi->calculateBedsOccupied($bKey, $to);
                $bedCount           += (int) ($bedCounts[$bKey] ?? 0);

                $surgeryRow = $surgeryStats->get($bKey);
                $surgeryCount       += (int) ($surgeryRow->total ?? 0);
                $majorSurgeries     += (int) ($surgeryRow->major ?? 0);
            }

            if ($bedCount > 0) {
                $bedOccupancyPct = round(($bedOccupancy / $bedCount) * 100, 2);
            }
            if ($totalPatients > 0) {
                $avgRevenuePerPatient = round($totalRevenue / $totalPatients, 2);
            }

            $dto = new KpiData(
                totalRevenue: $totalRevenue,
                totalPatients: $totalPatients,
                opCount: $opCount,
                ipCount: $ipCount,
                dischargeCount: $dischargeCount,
                erCount: $erCount,
                discountAmount: $discountAmount,
                netCollection: $netCollection,
                packageConsumption: $packageConsumption,
                pharmacySales: $pharmacySales,
                bedOccupancyPct: $bedOccupancyPct,
                bedOccupancy: $bedOccupancy,
                bedCount: $bedCount,
                avgRevenuePerPatient: $avgRevenuePerPatient,
                surgeryCount: $surgeryCount,
                majorSurgeries: $majorSurgeries,
            );

            return response()->json([
                'success' => true,
                'data'    => new KpiResource($dto->toArray()),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function dailyTrend(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->dailyTrend($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function monthlyTrend(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $year   = (int) $request->input('year', Carbon::now()->year);
            return response()->json(['success' => true, 'data' => $this->analytics->monthlyTrend($branch, $year, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function deptRevenue(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->deptRevenue($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function payerMix(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->payerMix($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function patientMix(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->patientMix($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function branchComparison(AnalyticsRequest $request): JsonResponse
    {
        try {
            $from = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to   = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->branchComparison($from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function doctorRevenue(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->doctorRevenue($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function surgeries(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->surgeries($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function admissions(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->admissions($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function ipDemographics(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->ipDemographics($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function surgeryDetail(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->surgeryDetail($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function collectionReport(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->collectionReport($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function serviceRevenue(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->serviceRevenue($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function doctorPerformance(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->doctorPerformance($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function opMetrics(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $this->parseBranches($request->input('branch', 'chromepet'));
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->opMetrics($branch, $from, $to, $request->filters())]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
