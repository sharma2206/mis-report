<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Services\SurgeryAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class SurgeryAnalyticsController extends Controller
{
    public function __construct(private SurgeryAnalyticsService $svc) {}

    private function parseBranches(string|array|null $v): array|string
    {
        if (empty($v) || $v === 'all') return 'all';
        if (is_array($v)) return in_array('all', $v, true) ? 'all' : $v;
        return explode(',', $v);
    }

    private function params(AnalyticsRequest $r): array
    {
        return [
            'branch' => $this->parseBranches($r->input('branch', 'chromepet')),
            'from'   => $r->input('from', Carbon::now()->startOfMonth()->format('Y-m-d')),
            'to'     => $r->input('to',   Carbon::now()->format('Y-m-d')),
            'filters'=> $r->except(['branch', 'from', 'to']),
        ];
    }

    public function kpis(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->kpis($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function trend(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->trend($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function distribution(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->distribution($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function surgeonPerformance(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->surgeonPerformance($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function otDashboard(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->otDashboard($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function anaesthesia(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->anaesthesia($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function patientProfile(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->patientProfile($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function qualityMetrics(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->qualityMetrics($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function payerAnalytics(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->payerAnalytics($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function insights(AnalyticsRequest $r): JsonResponse
    {
        try {
            ['branch' => $branch, 'from' => $from, 'to' => $to, 'filters' => $f] = $this->params($r);
            return response()->json(['success' => true, 'data' => $this->svc->insights($branch, $from, $to, $f)]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
