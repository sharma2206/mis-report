<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Models\AuditLog;
use App\Services\AnalyticsDrilldownService;
use Illuminate\Http\JsonResponse;

class AnalyticsDrilldownController extends Controller
{
    public function __construct(private AnalyticsDrilldownService $service) {}

    public function index(AnalyticsRequest $request, string $type): JsonResponse
    {
        $from = $request->validated('from', now()->startOfMonth()->toDateString());
        $to = $request->validated('to', now()->toDateString());

        $data = $this->service->paginate(
            $type,
            $request->branches(),
            $from,
            $to,
            $request->filters(),
            min((int) $request->validated('limit', 25), 100),
        );

        AuditLog::record('analytics_drilldown_viewed', [
            'type' => $type,
            'branches' => $request->branches(),
            'from' => $from,
            'to' => $to,
            'page' => $data->currentPage(),
        ], null, $to, $request);

        return response()->json(['success' => true, 'data' => $data]);
    }
}
