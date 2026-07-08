<?php

namespace App\Http\Controllers\Api;

use App\Services\OperationalService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class OperationalController extends Controller
{
    public function __construct(private OperationalService $service) {}

    // ─── Shared param extraction ─────────────────────────────────────────────

    private function branch(Request $request): ?string
    {
        return $request->query('branch') ?: null;
    }

    private function date(Request $request): string
    {
        return $request->query('date', now()->toDateString());
    }

    private function from(Request $request, string $date): string
    {
        return $request->query('from', Carbon::parse($date)->startOfMonth()->toDateString());
    }

    private function to(Request $request, string $date): string
    {
        return $request->query('to', $date);
    }

    private function requireBranch(Request $request): ?JsonResponse
    {
        if (!$this->branch($request)) {
            return response()->json(['success' => false, 'message' => 'Branch is required'], 422);
        }
        return null;
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    public function kpis(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getKpis($branch, $date),
        ]);
    }

    public function bedOccupancy(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getBedOccupancy($branch, $date),
        ]);
    }

    public function admissions(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);
        $from   = $this->from($request, $date);
        $to     = $this->to($request, $date);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getAdmissionStats($branch, $from, $to),
        ]);
    }

    public function census(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getCensus($branch, $date),
        ]);
    }

    public function surgery(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);
        $from   = $this->from($request, $date);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getSurgeryStats($branch, $date, $from),
        ]);
    }

    public function departments(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);
        $from   = $this->from($request, $date);
        $to     = $this->to($request, $date);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getDepartmentOps($branch, $from, $to),
        ]);
    }

    public function doctors(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);
        $from   = $this->from($request, $date);
        $to     = $this->to($request, $date);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getDoctorOps($branch, $from, $to),
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getAlerts($branch, $date),
        ]);
    }

    public function analytics(Request $request): JsonResponse
    {
        if ($err = $this->requireBranch($request)) return $err;
        $branch = $this->branch($request);
        $date   = $this->date($request);
        $from   = $this->from($request, $date);
        $to     = $this->to($request, $date);

        return response()->json([
            'success' => true,
            'data'    => $this->service->getAnalyticsTrends($branch, $from, $to),
        ]);
    }
}
