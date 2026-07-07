<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MISRequest;
use App\Http\Requests\MISUploadRequest;
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
        $this->assertBranchAccess($request, $branch);

        try {
            $branchEnum = $request->branch();
            $date       = $request->reportDate();

            // 1. Process CSV files → import into DB
            $imported = $this->csvService->process(
                $branchEnum,
                $date,
                $request->file('bill_file'),
                $request->file('cashier_file'),
                $request->file('package_file'),
                $request->file('er_file'),
                $request->file('ip_file'),
                $request->file('surgery_file')
            );

            // 2. Generate MIS report — every KPI is calculated automatically from the
            //    freshly imported data; $sources records which optional files were
            //    included so future dashboard loads know which KPIs are available.
            $sources = $imported['sources'] ?? [];
            $report  = $this->misService->generateMIS($branchEnum, $date, $sources);

            \App\Models\AuditLog::record('upload', [
                'branch'   => $branch,
                'date'     => $date,
                'imported' => array_diff_key($imported, ['sources' => null]),
                'sources'  => $sources,
            ], $branch, $date, $request);

            // Record import log
            $filesUploaded = array_keys(array_filter($sources));
            $totalImported = array_sum(array_map(fn($v) => is_array($v) ? ($v['count'] ?? $v['imported'] ?? 0) : (int)$v,
                array_diff_key($imported, ['sources' => null])));
            $totalSkipped  = array_sum(array_map(fn($v) => is_array($v) ? ($v['skipped'] ?? 0) : 0,
                array_diff_key($imported, ['sources' => null])));
            $totalErrors   = array_sum(array_map(fn($v) => is_array($v) ? ($v['errors'] ?? 0) : 0,
                array_diff_key($imported, ['sources' => null])));
            \App\Models\ImportLog::create([
                'branch'         => $branch,
                'report_date'    => $date,
                'uploaded_by'    => $request->user()?->name ?? 'system',
                'files_uploaded' => $filesUploaded,
                'rows_imported'  => $totalImported,
                'rows_skipped'   => $totalSkipped,
                'rows_errored'   => $totalErrors,
                'status'         => $totalErrors > 0 ? 'partial' : 'success',
            ]);

            return response()->json([
                'success'  => true,
                'message'  => 'Files processed and MIS report generated successfully.',
                'imported' => $imported,
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
     * List import history logs.
     * GET /api/mis/import-logs?branch=chromepet&limit=20
     */
    public function importLogs(\Illuminate\Http\Request $request): JsonResponse
    {
        $branch = $request->input('branch');
        $limit  = min((int) $request->input('limit', 20), 100);

        $query = \App\Models\ImportLog::orderByDesc('created_at')->limit($limit);
        if ($branch) $query->where('branch', $branch);

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }

    /**
     * Rollback an import: delete all rows imported in that batch, mark log as rolled back.
     * DELETE /api/mis/import-logs/{id}
     */
    public function rollbackImport(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $log = \App\Models\ImportLog::findOrFail($id);

        // Prevent double-rollback
        if ($log->rolled_back_at) {
            return response()->json(['success' => false, 'message' => 'This import has already been rolled back.'], 422);
        }

        $this->assertBranchAccess($request, $log->branch);

        try {
            $branchEnum = \App\Enums\Branch::from($log->branch);
            $date       = $log->report_date->toDateString();

            // Delete all imported rows for this branch+date
            \App\Models\BillItem::where('branch', $log->branch)->whereDate('bill_date', $date)->delete();
            \App\Models\CashierCollection::where('branch', $log->branch)->whereDate('collection_date', $date)->delete();
            \App\Models\ErAdmission::where('branch', $log->branch)->whereDate('admission_date', $date)->delete();
            \App\Models\IpAdmission::where('branch', $log->branch)->whereDate('admission_date', $date)->delete();
            \App\Models\Surgery::where('branch', $log->branch)->whereDate('surgery_date', $date)->delete();

            if ($branchEnum === \App\Enums\Branch::CHROMEPET) {
                \App\Models\PackageConsumption::where('branch', $log->branch)->whereDate('consumption_date', $date)->delete();
            }

            // Bust caches
            \App\Repositories\CachedMisRepository::bustFor($log->branch, $date);

            // Mark log
            $log->update([
                'rolled_back_at' => now(),
                'rolled_back_by' => $request->user()?->name ?? 'system',
                'status'         => 'rolled_back',
            ]);

            \App\Models\AuditLog::record('import_rollback', [
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
        $this->assertBranchAccess($request, $branch);

        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            \App\Models\AuditLog::record('report_viewed', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

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
        $this->assertBranchAccess($request, $branch);

        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            $filename = $this->formatReportFilename($request->branch(), $request->reportDate());

            \App\Models\AuditLog::record('export_excel', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

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
        $this->assertBranchAccess($request, $branch);

        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            $pdf = Pdf::loadView('exports.mis_pdf', ['data' => $data])
                ->setPaper('a4', 'landscape');

            $filename = $this->formatReportFilename($request->branch(), $request->reportDate());

            \App\Models\AuditLog::record('export_pdf', ['branch' => $branch, 'date' => $date], $branch, $date, $request);

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
        $this->assertBranchAccess($request, $branch);

        try {
            $request->merge(['branch' => $branch, 'date' => $date]);
            $data     = $this->misService->generateMIS($request->branch(), $request->reportDate());
            $filename = $this->formatReportFilename($request->branch(), $request->reportDate(), 'MIS');
            \App\Models\AuditLog::record('export_csv', ['branch' => $branch, 'date' => $date], $branch, $date, $request);
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
        $this->assertBranchAccess($request, $branch);

        try {
            $request->validate(['to' => 'required|email']);
            $request->merge(['branch' => $branch, 'date' => $date]);
            $data = $this->misService->generateMIS($request->branch(), $request->reportDate());

            \App\Jobs\EmailReportJob::dispatch($data, $request->input('to'), $branch, $date);
            \App\Models\AuditLog::record('email_queued', ['to' => $request->input('to'), 'branch' => $branch, 'date' => $date], $branch, $date, $request);

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
        $this->assertBranchAccess($request, $branch);

        try {
            $branchEnum = \App\Enums\Branch::from($branch);
            $from = $request->query('from') ?: Carbon::today()->toDateString();
            $to   = $request->query('to')   ?: $from;

            $fromDt = Carbon::createFromFormat('Y-m-d', $from);
            $toDt   = Carbon::createFromFormat('Y-m-d', $to);

            $branchShort = strtoupper(substr($branch, 0, 3));
            $filename    = "BRM-{$branchShort}-{$fromDt->format('dMY')}-{$toDt->format('dMY')}";

            \App\Models\AuditLog::record('export_brm', [
                'branch' => $branch, 'from' => $from, 'to' => $to,
            ], $branch, $from, $request);

            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\BRMExport($branchEnum->value, $from, $to),
                "{$filename}.xlsx"
            );
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Format report filename like: "Sales VS Collection 3rd June 2026(Chromepet)"
     *
     * @param \App\Enums\Branch $branchEnum
     * @param string $date (Y-m-d)
     * @param string $prefix
     * @return string
     */
    private function assertBranchAccess(Request $request, string $branch): void
    {
        if (!$request->user()->canAccessBranch($branch)) {
            abort(403, 'You are not authorised to access the ' . $branch . ' branch.');
        }
    }

    private function formatReportFilename(\App\Enums\Branch $branchEnum, string $date, string $prefix = 'Sales VS Collection'): string
    {
        $dt = Carbon::createFromFormat('Y-m-d', $date);
        $formattedDate = $dt->format('jS F Y');

        return "{$prefix} {$formattedDate}({$branchEnum->label()})";
    }
}
