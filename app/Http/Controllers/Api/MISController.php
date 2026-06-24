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

            // 2. Build volume data: use derived counts from uploaded files where available,
            //    fall back to manual form values for fields not covered by file uploads.
            $volumeData = $request->volumeData();
            $derived    = $imported['derived'] ?? [];

            if (isset($derived['admission']) && $derived['admission'] !== null) {
                $volumeData['ftd']['admission'] = $derived['admission'];
            }
            if (isset($derived['discharge']) && $derived['discharge'] !== null) {
                $volumeData['ftd']['discharge'] = $derived['discharge'];
            }
            if (isset($derived['er_count']) && $derived['er_count'] !== null) {
                $volumeData['ftd']['er_count'] = $derived['er_count'];
            }

            // 3. Generate MIS report
            $report = $this->misService->generateMIS($branchEnum, $date, $volumeData);

            \App\Models\AuditLog::record('upload', [
                'branch'   => $branch,
                'date'     => $date,
                'imported' => array_diff_key($imported, ['derived' => null]),
                'derived'  => $derived['sources'] ?? [],
            ], $branch, $date, $request);

            return response()->json([
                'success'  => true,
                'message'  => 'Files processed and MIS report generated successfully.',
                'imported' => $imported,
                'derived'  => $derived,
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
     * Format report filename like: "Sales VS Collection 3rd June 2026(Chromepet)"
     *
     * @param \App\Enums\Branch $branchEnum
     * @param string $date (Y-m-d)
     * @param string $prefix
     * @return string
     */
    private function formatReportFilename(\App\Enums\Branch $branchEnum, string $date, string $prefix = 'Sales VS Collection'): string
    {
        $dt = Carbon::createFromFormat('Y-m-d', $date);
        $formattedDate = $dt->format('jS F Y');

        return "{$prefix} {$formattedDate}({$branchEnum->label()})";
    }
}
