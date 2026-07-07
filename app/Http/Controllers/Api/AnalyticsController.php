<?php

namespace App\Http\Controllers\Api;

use App\DTOs\KpiData;
use App\Enums\Branch;
use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Http\Resources\KpiResource;
use App\Models\BillItem;
use App\Models\Surgery;
use App\Services\AnalyticsService;
use App\Services\DashboardKpiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    public function __construct(
        private DashboardKpiService $kpi,
        private AnalyticsService $analytics
    ) {}

    public function kpi(AnalyticsRequest $request, string $branch, string $date): JsonResponse
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

            $discountAmount = (float) BillItem::forBranch($branch)->forDate($date)->saleStatus()->sum('discount_amount');

            $netCollection      = $this->kpi->calculateCashCollection($branchEnum, $date);
            $packageConsumption = $this->kpi->calculatePackageRevenue($branchEnum, $date);
            $pharmacySales      = $this->kpi->calculatePharmacyRevenue($branchEnum, $date);
            $occupancyPct       = $this->kpi->calculateOccupancy($branchEnum, $date);
            $occupancy          = $this->kpi->calculateBedsOccupied($branchEnum, $date);
            $bedCount           = $branchEnum->bedCount();

            $avgRevenuePerPatient = ($totalPatients > 0 && $totalRevenue !== null)
                ? round($totalRevenue / $totalPatients, 2) : 0;

            $surgeryCount   = Surgery::forBranch($branch)->forDate($date)->count();
            $majorSurgeries = Surgery::forBranch($branch)->forDate($date)->where('surgery_category', 'Major')->count();

            $dto = new KpiData(
                totalRevenue:         $totalRevenue,
                totalPatients:        $totalPatients,
                opCount:              $opCount,
                ipCount:              $ipCount,
                erCount:              $erCount,
                discountAmount:       $discountAmount,
                netCollection:        $netCollection,
                packageConsumption:   $packageConsumption,
                pharmacySales:        $pharmacySales,
                bedOccupancyPct:      $occupancyPct,
                bedOccupancy:         $occupancy,
                bedCount:             $bedCount,
                avgRevenuePerPatient: $avgRevenuePerPatient,
                surgeryCount:         $surgeryCount,
                majorSurgeries:       $majorSurgeries,
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
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->dailyTrend($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function monthlyTrend(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $year   = (int) $request->input('year', Carbon::now()->year);
            return response()->json(['success' => true, 'data' => $this->analytics->monthlyTrend($branch, $year)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function deptRevenue(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->deptRevenue($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function payerMix(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->payerMix($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function patientMix(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->patientMix($branch, $from, $to)]);
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
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->doctorRevenue($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function surgeries(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->surgeries($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function admissions(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->admissions($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function ipDemographics(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->ipDemographics($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function surgeryDetail(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->surgeryDetail($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function collectionReport(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->collectionReport($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function serviceRevenue(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->serviceRevenue($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function doctorPerformance(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $to     = $request->input('to',   Carbon::now()->format('Y-m-d'));
            return response()->json(['success' => true, 'data' => $this->analytics->doctorPerformance($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function opMetrics(AnalyticsRequest $request): JsonResponse
    {
        try {
            $branch = $request->input('branch', 'chromepet');
            $from   = $request->input('from', $request->input('date', Carbon::now()->format('Y-m-d')));
            $to     = $request->input('to', $from);
            return response()->json(['success' => true, 'data' => $this->analytics->opMetrics($branch, $from, $to)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
