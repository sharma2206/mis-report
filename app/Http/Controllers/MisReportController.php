<?php

namespace App\Http\Controllers;

use App\Exports\MisReportExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\BranchMISRequest;
use App\Http\Requests\MISUploadRequest;
use App\Jobs\ProcessMisReportJob;
use App\Services\MISService;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MisReportController extends Controller
{
    public function __construct(private MISService $misService) {
        
    }

    /**
     * POST /api/mis/upload
     * Upload 3 CSV files for processing.
     */
    public function upload(MISUploadRequest $request): JsonResponse
    {
        try {
            $report = $this->misService->storeUploads(
                $request->input('date'),
                $request->file('bill_file'),
                $request->file('collection_file'),
                $request->file('package_file'),
                $request->only(['occupancy', 'occupancy_percent', 'admission', 'discharge'])
            );

            // Dispatch async job for heavy calculations
            ProcessMisReportJob::dispatch($request->input('date'));

            return response()->json([
                'success' => true,
                'message' => 'Files uploaded successfully. MIS Report is being processed.',
                'data'    => [
                    'report_id'   => $report->id,
                    'report_date' => $report->report_date->toDateString(),
                    'status'      => $report->status,
                ],
            ], 202);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/mis/{date}
     * Retrieve MIS Report for a given date.
     */
    public function show(string $date): JsonResponse
    {
        $report = $this->misService->getReport($date);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => "No MIS Report found for {$date}",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'report_date'  => $report->report_date->toDateString(),
                'status'       => $report->status,
                'processed_at' => $report->processed_at,
                'mis'          => $report->payload,
            ],
        ]);
    }


    public function chromepet(BranchMISRequest $request): JsonResponse
    {
        $data = $this->misService->generateMIS('Chromepet', $request->validated('date'));

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function oragadam(BranchMISRequest $request): JsonResponse
    {
        $data = $this->misService->generateMIS('Oragadam', $request->validated('date'));

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * POST /api/mis/{date}/regenerate
     * Force regeneration of an existing report.
     */
    public function regenerate(string $date): JsonResponse
    {
        // ProcessMisReportJob::dispatch($date);

        return response()->json([
            'success' => true,
            'message' => "MIS Report regeneration queued for {$date}",
        ], 202);
    }

    /**
     * GET /api/mis/{date}/export
     * Download MIS report as Excel.
     */
    public function export(string $date): BinaryFileResponse
    {
        $report = $this->misService->getReport($date);

        abort_if(!$report, 404, 'MIS Report not found');
        abort_if($report->status !== 'completed', 422, 'MIS Report not yet completed');

        return Excel::download(new MisReportExport($report), "MIS_Report_{$date}.xlsx");
    }
}
