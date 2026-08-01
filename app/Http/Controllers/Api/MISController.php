<?php

namespace App\Http\Controllers\Api;

use App\Enums\Branch;
use App\Http\Controllers\Controller;
use App\Http\Requests\MISRequest;
use App\Http\Resources\ImportLogResource;
use App\Http\Requests\MISUploadRequest;
use App\Http\Requests\MISUploadSingleRequest;
use App\Models\AuditLog;
use App\Models\ImportLog;
use App\Models\MisReport;
use App\Repositories\CachedMisRepository;
use App\Services\CsvProcessingService;
use App\Services\MISService;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Carbon\Carbon;

class MISController extends Controller
{
    /**
     * @param MISService $misService
     * @param CsvProcessingService $csvService
     */
    public function __construct(
        private MISService $misService,
        private CsvProcessingService $csvService
    ) {}

    /**
     * Upload CSV files, import data, and generate MIS report.
     *
     * Chromepet: bill_file + cashier_file + package_file (3 files)
     * Oragadam:  bill_file + cashier_file               (2 files)
     *
     * @param MISUploadRequest $request
     * @param string $branch
     * @return JsonResponse
     */
    public function upload(MISUploadRequest $request, string $branch): JsonResponse
    {
        $startMs = (int) round(microtime(true) * 1000);
        try {
            $branchEnum = $request->branch();
            $date       = $request->reportDate();

            // 1. Process CSV files → each file gets its own transaction + ImportLog row.
            //    Soft-delete is scoped to exact (branch, billing_date) only.
            $imported = $this->csvService->process(
                branch:      $branchEnum,
                date:        $date,
                billFile:    $request->file('bill_file'),
                cashierFile: $request->file('cashier_file'),
                packageFile: $request->file('package_file'),
                erFile:      $request->file('er_file'),
                ipFile:      $request->file('ip_file'),
                surgeryFile: $request->file('surgery_file'),
                userId:      $request->user()?->id,
                uploadedBy:  $request->user()?->name ?? 'system',
            );

            // 2. Generate MIS report from freshly imported data
            $sources = $imported['sources'] ?? [];
            $report  = $this->misService->generateMIS($branchEnum, $date, $sources);

            AuditLog::record('upload', [
                'branch'   => $branch,
                'date'     => $date,
                'imported' => array_diff_key($imported, ['sources' => null, 'logs' => null]),
                'sources'  => $sources,
            ], $branch, $date, $request);

            return response()->json([
                'success'  => true,
                'message'  => 'Files processed and MIS report generated successfully.',
                'imported' => array_diff_key($imported, ['logs' => null]),
                'logs'     => $imported['logs'] ?? [],
                'data'     => $report,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload a single report file.
     * POST /api/mis/{branch}/upload-single
     * Any one of the six file fields may be submitted; others are ignored.
     */
    public function uploadSingle(MISUploadSingleRequest $request, string $branch): JsonResponse
    {
        $startMs    = (int) round(microtime(true) * 1000);
        $branchEnum = $request->branch();
        $date       = $request->reportDate();

        try {
            // Each file gets its own transaction + ImportLog. Soft-delete is exact-date only.
            $imported = $this->csvService->process(
                branch:      $branchEnum,
                date:        $date,
                billFile:    $request->file('bill_file'),
                cashierFile: $request->file('cashier_file'),
                packageFile: $request->file('package_file'),
                erFile:      $request->file('er_file'),
                ipFile:      $request->file('ip_file'),
                surgeryFile: $request->file('surgery_file'),
                userId:      $request->user()?->id,
                uploadedBy:  $request->user()?->name ?? 'system',
            );

            $sources = $imported['sources'] ?? [];
            $report  = $this->misService->generateMIS($branchEnum, $date, $sources);

            // Determine which single type was uploaded (for audit log)
            $typeMap = [
                'bill'    => 'bill_file',
                'cashier' => 'cashier_file',
                'package' => 'package_file',
                'er'      => 'er_file',
                'ip'      => 'ip_file',
                'surgery' => 'surgery_file',
            ];
            $uploadedType = null;
            foreach ($typeMap as $type => $field) {
                if ($request->hasFile($field)) {
                    $uploadedType = $type;
                    break;
                }
            }

            AuditLog::record('upload_single', [
                'branch'   => $branch,
                'date'     => $date,
                'type'     => $uploadedType,
                'imported' => array_diff_key($imported, ['sources' => null, 'logs' => null]),
            ], $branch, $date, $request);

            return response()->json([
                'success'     => true,
                'message'     => 'File imported successfully.',
                'imported'    => array_diff_key($imported, ['logs' => null]),
                'logs'        => $imported['logs'] ?? [],
                'report_type' => $uploadedType,
                'data'        => $report,
            ]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Return the latest import status for every report type for a branch.
     * GET /api/mis/{branch}/import-status
     */
    public function importStatus(Request $request, string $branch): JsonResponse
    {
        $types = ['bill_items', 'cashier', 'er', 'ip', 'surgery', 'package'];
        $result = [];

        foreach ($types as $type) {
            $log = ImportLog::where('branch', $branch)
                ->whereNull('rolled_back_at')
                ->where(function ($q) use ($type) {
                    $q->where('report_type', $type)
                        ->orWhereJsonContains('files_uploaded', $type);
                })
                ->latest()
                ->first();

            $result[$type] = $log ? [
                'status'      => $log->status,
                'log_id'      => $log->id,
                'imported_at' => $log->created_at?->toIso8601String(),
                'rows'        => $log->rows_imported,
                'skipped'     => $log->rows_skipped,
                'errors'      => $log->rows_errored,
                'period_from' => $log->period_from?->toDateString(),
                'period_to'   => $log->period_to?->toDateString(),
                'report_date' => $log->report_date?->toDateString(),
                'uploaded_by' => $log->uploaded_by,
                'duration_ms' => $log->duration_ms,
            ] : ['status' => 'pending'];
        }

        // Compute overall period from all uploaded types
        $froms = collect($result)->filter(fn($r) => !empty($r['period_from']))->pluck('period_from');
        $tos   = collect($result)->filter(fn($r) => !empty($r['period_to']))->pluck('period_to');

        return response()->json([
            'success'      => true,
            'data'         => $result,
            'overall_from' => $froms->min(),
            'overall_to'   => $tos->max(),
        ]);
    }

    /**
     * List import history logs.
     * GET /api/mis/import-logs?branch=chromepet&limit=20
     */
    public function importLogs(\Illuminate\Http\Request $request): JsonResponse
    {
        $branch = $request->input('branch');
        $limit  = min((int) $request->input('limit', 20), 100);

        $query = ImportLog::orderByDesc('created_at');
        if ($branch) $query->where('branch', $branch);

        $logs = $query->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => ImportLogResource::collection($logs->items()),
            'meta'    => [
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * Rollback an import: delete all rows imported in that batch, mark log as rolled back.
     * DELETE /api/mis/import-logs/{id}
     */
    public function rollbackImport(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $log = ImportLog::findOrFail($id);

        // Prevent double-rollback
        if ($log->rolled_back_at) {
            return response()->json(['success' => false, 'message' => 'This import has already been rolled back.'], 422);
        }

        // Rollback URL has no {branch} segment — middleware cannot cover it; check explicitly
        if (! $request->user()->canAccessBranch($log->branch)) {
            return response()->json(['success' => false, 'message' => 'Access denied for this branch.'], 403);
        }

        try {
            $branchEnum = Branch::from($log->branch);
            $date       = $log->report_date->toDateString();

            // Delete via the single canonical method — do NOT duplicate this logic here
            $this->csvService->deleteForBranchDate($branchEnum, $date);

            // Remove the materialized MIS snapshot so the dashboard does not
            // serve aggregated figures from data that no longer exists
            MisReport::where('branch', $log->branch)
                ->whereDate('report_date', $date)
                ->delete();

            CachedMisRepository::bustFor($log->branch, $date);

            // Mark log
            $log->update([
                'rolled_back_at' => now(),
                'rolled_back_by' => $request->user()?->name ?? 'system',
                'status'         => 'rolled_back',
            ]);

            AuditLog::record('import_rollback', [
                'import_log_id' => $id,
                'branch'        => $log->branch,
                'date'          => $date,
            ], $log->branch, $date, $request);

            return response()->json([
                'success' => true,
                'message' => "Rolled back {$log->rows_imported} rows for {$log->branch} on {$date}.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Display the MIS report.
     *
     * @param MISRequest $request
     * @param string $branch
     * @param string $date
     * @return JsonResponse
     */
    public function show(MISRequest $request, string $branch, string $date): JsonResponse
    {
        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            AuditLog::record('report_viewed', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

            return response()->json([
                'success' => true,
                'data'    => $data,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export the MIS report to Excel.
     *
     * @param MISRequest $request
     * @param string $branch
     * @param string $date
     * @return BinaryFileResponse|JsonResponse
     */
    public function export(MISRequest $request, string $branch, string $date)
    {
        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            $filename = $this->formatReportFilename($request->branch(), $request->reportDate());

            AuditLog::record('export_excel', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\MISExport($data),
                "{$filename}.xlsx"
            );
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export the MIS report to PDF.
     *
     * @param MISRequest $request
     * @param string $branch
     * @param string $date
     * @return \Illuminate\Http\Response|JsonResponse
     */
    public function exportPdf(MISRequest $request, string $branch, string $date)
    {
        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            $pdf = Pdf::loadView('exports.mis_pdf', ['data' => $data])
                ->setPaper('a4', 'landscape');

            $filename = $this->formatReportFilename($request->branch(), $request->reportDate());

            AuditLog::record('export_pdf', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

            return $pdf->download("{$filename}.pdf");
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export MIS report as CSV (flat tabular rows).
     */
    public function exportCsv(MISRequest $request, string $branch, string $date)
    {
        try {
            $request->merge(['branch' => $branch, 'date' => $date]);
            $data     = $this->misService->generateMIS($request->branch(), $request->reportDate());
            $filename = $this->formatReportFilename($request->branch(), $request->reportDate(), 'MIS');
            AuditLog::record('export_csv', ['branch' => $branch, 'date' => $date], $branch, $date, $request);
            return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\MisCsvExport($data), "{$filename}.csv", \Maatwebsite\Excel\Excel::CSV);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Queue an email of the PDF report to a given address.
     * POST /api/mis/{branch}/{date}/email   body: { "to": "email@example.com" }
     */
    public function emailReport(MISRequest $request, string $branch, string $date): JsonResponse
    {
        try {
            $request->validate(['to' => 'required|email']);
            $request->merge(['branch' => $branch, 'date' => $date]);
            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            \App\Jobs\EmailReportJob::dispatch($data, $request->input('to'), $branch, $date);
            AuditLog::record('email_queued', ['to' => $request->input('to'), 'branch' => $branch, 'date' => $date], $branch, $date, $request);

            return response()->json(['success' => true, 'message' => 'Report email queued successfully.']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Get dashboard summary for all branches on a given date.
     *
     * @param string $date
     * @return JsonResponse
     */
    public function dashboard(string $date): JsonResponse
    {
        try {
            $summary = $this->misService->getDashboardSummary($date);

            return response()->json([
                'success' => true,
                'data'    => $summary,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Print-preview page (browser prints / saves to PDF).
     * GET /print/{branch}/{date}
     */
    public function printPreview(string $branch, string $date)
    {
        try {
            $branchEnum = \App\Enums\Branch::from($branch);
            $data       = $this->misService->generateMIS($branchEnum, $date);
            return view('print_preview', compact('data', 'branch', 'date'));
        } catch (Exception $e) {
            abort(422, $e->getMessage());
        }
    }

    /**
     * Export doctor-wise BRM (Business Revenue Management) report as multi-sheet Excel.
     * Sheets: ER IP | OP SERVICES | OP CONSULTATIONS
     * Query params: from=Y-m-d&to=Y-m-d
     */
    public function exportBrm(Request $request, string $branch)
    {
        try {
            $branchEnum = \App\Enums\Branch::from($branch);
            $from = $request->query('from') ?: Carbon::today()->toDateString();
            $to   = $request->query('to')   ?: $from;

            $fromDt = Carbon::createFromFormat('Y-m-d', $from);
            $toDt   = Carbon::createFromFormat('Y-m-d', $to);

            $branchShort = strtoupper(substr($branch, 0, 3));
            $filename    = "BRM-{$branchShort}-{$fromDt->format('dMY')}-{$toDt->format('dMY')}";

            AuditLog::record('export_brm', [
                'branch' => $branch,
                'from' => $from,
                'to' => $to,
            ], $branch, $from, $request);

            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\BRMExport($branchEnum->value, $from, $to),
                "{$filename}.xlsx"
            );
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    private function formatReportFilename(\App\Enums\Branch $branchEnum, string $date, string $prefix = 'Sales VS Collection'): string
    {
        $dt = Carbon::createFromFormat('Y-m-d', $date);
        $formattedDate = $dt->format('jS F Y');

        return "{$prefix} {$formattedDate}({$branchEnum->label()})";
    }
}
