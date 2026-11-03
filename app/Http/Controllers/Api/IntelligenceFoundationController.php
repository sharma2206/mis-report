<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Services\DataQualityService;
use App\Services\SourceCapabilityService;
use Illuminate\Http\JsonResponse;

class IntelligenceFoundationController extends Controller
{
    public function __construct(
        private DataQualityService $quality,
        private SourceCapabilityService $sources,
    ) {}

    public function sourceCapabilities(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->sources->catalog()]);
    }

    public function qualitySummary(AnalyticsRequest $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->quality->summary(
                $request->branches(),
                $request->validated('from'),
                $request->validated('to'),
            ),
        ]);
    }

    public function qualityIssues(AnalyticsRequest $request, string $code): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->quality->issues(
                $code,
                $request->branches(),
                $request->validated('from'),
                $request->validated('to'),
                (int) $request->validated('limit', 50),
            ),
        ]);
    }

    public function qualitySnapshot(AnalyticsRequest $request): JsonResponse
    {
        $snapshot = $this->quality->snapshot(
            $request->branches(),
            $request->validated('from'),
            $request->validated('to'),
        );

        return response()->json(['success' => true, 'data' => $snapshot], 201);
    }
}
