<?php

namespace App\Services;

use App\Enums\Branch;
use App\Imports\BillItemImport;
use App\Imports\CashierCollectionImport;
use App\Imports\ErAdmissionImport;
use App\Imports\IpAdmissionImport;
use App\Imports\PackageConsumptionImport;
use App\Imports\SurgeryImport;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\ImportLog;
use App\Models\PackageConsumption;
use App\Models\Surgery;
use App\Repositories\CachedMisRepository;
use App\Services\CachedAnalyticsService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class CsvProcessingService
{
    /**
     * Process uploaded CSV files for a given branch and date.
     *
     * Key guarantee: each file is imported in its own independent transaction.
     * A failure in one file rolls back only that file; others are unaffected.
     *
     * Soft-delete condition: ONLY `branch = $branch AND DATE(date_col) = $date`.
     * We NEVER derive a delete range from CSV content — the billing date comes
     * exclusively from the user-submitted request field.
     *
     * @return array{
     *   bill_items:int, cashier_collections:int, package_consumptions:int,
     *   er_admissions:int, ip_admissions:int, surgeries:int,
     *   sources:array<string,bool>, logs:array<string,array>
     * }
     */
    public function process(
        Branch        $branch,
        string        $date,
        ?UploadedFile $billFile    = null,
        ?UploadedFile $cashierFile = null,
        ?UploadedFile $packageFile = null,
        ?UploadedFile $erFile      = null,
        ?UploadedFile $ipFile      = null,
        ?UploadedFile $surgeryFile = null,
        ?int          $userId      = null,
        ?string       $uploadedBy  = null,
    ): array {
        $results = [
            'bill_items'           => 0,
            'cashier_collections'  => 0,
            'package_consumptions' => 0,
            'er_admissions'        => 0,
            'ip_admissions'        => 0,
            'surgeries'            => 0,
            'sources' => [
                'bill'    => false,
                'cashier' => false,
                'package' => false,
                'er'      => false,
                'ip'      => false,
                'surgery' => false,
            ],
            'logs' => [],
        ];

        // ── Each file is processed independently ─────────────────────────────

        if ($billFile) {
            $r = $this->importFile(
                key:         'bill',
                branch:      $branch,
                date:        $date,
                file:        $billFile,
                model:       BillItem::class,
                dateCol:     'bill_date',
                importClass: BillItemImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['bill_items']      = $r['inserted'];
            $results['sources']['bill'] = $r['success'];
            $results['logs']['bill']    = $r;
        }

        if ($cashierFile) {
            $r = $this->importFile(
                key:         'cashier',
                branch:      $branch,
                date:        $date,
                file:        $cashierFile,
                model:       CashierCollection::class,
                dateCol:     'collection_date',
                importClass: CashierCollectionImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['cashier_collections'] = $r['inserted'];
            $results['sources']['cashier']  = $r['success'];
            $results['logs']['cashier']     = $r;
        }

        if ($branch === Branch::CHROMEPET && $packageFile) {
            $r = $this->importFile(
                key:         'package',
                branch:      $branch,
                date:        $date,
                file:        $packageFile,
                model:       PackageConsumption::class,
                dateCol:     'consumption_date',
                importClass: PackageConsumptionImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['package_consumptions'] = $r['inserted'];
            $results['sources']['package']   = $r['success'];
            $results['logs']['package']      = $r;
        }

        if ($erFile) {
            $r = $this->importFile(
                key:         'er',
                branch:      $branch,
                date:        $date,
                file:        $erFile,
                model:       ErAdmission::class,
                dateCol:     'admission_date',
                importClass: ErAdmissionImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['er_admissions']  = $r['inserted'];
            $results['sources']['er']  = $r['success'];
            $results['logs']['er']     = $r;
        }

        if ($ipFile) {
            $r = $this->importFile(
                key:         'ip',
                branch:      $branch,
                date:        $date,
                file:        $ipFile,
                model:       IpAdmission::class,
                dateCol:     'admission_date',
                importClass: IpAdmissionImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['ip_admissions'] = $r['inserted'];
            $results['sources']['ip'] = $r['success'];
            $results['logs']['ip']    = $r;
        }

        if ($surgeryFile) {
            $r = $this->importFile(
                key:         'surgery',
                branch:      $branch,
                date:        $date,
                file:        $surgeryFile,
                model:       Surgery::class,
                dateCol:     'surgery_date',
                importClass: SurgeryImport::class,
                userId:      $userId,
                uploadedBy:  $uploadedBy,
            );
            $results['surgeries']          = $r['inserted'];
            $results['sources']['surgery'] = $r['success'];
            $results['logs']['surgery']    = $r;
        }

        // Bust caches after all files are processed
        CachedMisRepository::bustFor($branch->value, $date);
        CachedAnalyticsService::bustForBranch($branch->value);

        return $results;
    }

    /**
     * Import a single CSV file in its own isolated transaction.
     *
     * Flow:
     *   1. Validate the CSV has at least 1 data row.
     *   2. Acquire a MySQL advisory lock (prevents concurrent re-upload collision).
     *   3. BEGIN TRANSACTION
     *       a. Force-delete (permanent) rows WHERE branch=$branch AND DATE(date_col)=$date.
     *          forceDelete() bypasses SoftDeletes so rows are physically removed.
     *       b. Import rows via Laravel Excel (chunk-read + batch-insert).
     *   4. COMMIT (or ROLLBACK on exception — no data is lost on failure).
     *   5. RELEASE advisory lock.
     *   6. Write one ImportLog row with full statistics.
     *
     * @return array{key:string, success:bool, inserted:int, deleted:int, skipped:int,
     *               rows_read:int, errors:int, duration_ms:int, error_message:string|null,
     *               file_name:string, billing_date:string, branch:string}
     */
    private function importFile(
        string       $key,
        Branch       $branch,
        string       $date,
        UploadedFile $file,
        string       $model,
        string       $dateCol,
        string       $importClass,
        ?int         $userId,
        ?string      $uploadedBy,
    ): array {
        $startMs  = (int) round(microtime(true) * 1000);
        $lockName = "mis_import:{$branch->value}:{$date}:{$key}";

        $log = [
            'key'           => $key,
            'file_name'     => $file->getClientOriginalName(),
            'billing_date'  => $date,
            'branch'        => $branch->value,
            'success'       => false,
            'rows_read'     => 0,
            'deleted'       => 0,
            'inserted'      => 0,
            'skipped'       => 0,
            'duplicates'    => 0,
            'errors'        => 0,
            'duration_ms'   => 0,
            'error_message' => null,
        ];

        try {
            // ── Step 1: Validate CSV has data before doing anything destructive ─
            $rowsRead       = $this->countCsvRows($file->getRealPath());
            $log['rows_read'] = $rowsRead;

            if ($rowsRead === 0) {
                $log['error_message'] = 'CSV file is empty or contains only a header row.';
                $log['duration_ms']   = (int) round(microtime(true) * 1000) - $startMs;
                $this->writeImportLog($log, $userId, $uploadedBy, $date);
                return $log;
            }

            // ── Step 2: Advisory lock — serialise concurrent uploads for same key ─
            DB::statement('SELECT GET_LOCK(?, 30)', [$lockName]);

            try {
                // ── Steps 3-4: Per-file transaction ───────────────────────────
                DB::transaction(function () use (
                    $branch, $date, $file, $model, $dateCol, $importClass, &$log
                ) {
                    // Force-delete (permanent) rows matching exact branch + exact billing date.
                    // Using forceDelete() instead of delete() so rows are physically removed
                    // and can never appear as ghost/duplicate entries in queries.
                    $deleted = $model::where('branch', $branch->value)
                        ->whereDate($dateCol, $date)
                        ->forceDelete();   // hard delete — bypasses SoftDeletes

                    $log['deleted'] = (int) $deleted;

                    // Import new rows (chunk-read + batch-insert inside the importer)
                    $importer = new $importClass($branch, $date);
                    Excel::import($importer, $file);

                    $log['inserted'] = $importer->rowCount ?? 0;
                    $log['skipped']  = max(0, $log['rows_read'] - $log['inserted']);
                    $log['success']  = true;
                });

            } finally {
                // Always release advisory lock regardless of success/failure
                DB::statement('SELECT RELEASE_LOCK(?)', [$lockName]);
            }

        } catch (\Throwable $e) {
            $log['success']       = false;
            $log['errors']        = 1;
            $log['error_message'] = $e->getMessage();

            Log::error("CSV import failed [{$key}]", [
                'branch'    => $branch->value,
                'date'      => $date,
                'file'      => $file->getClientOriginalName(),
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
        }

        $log['duration_ms'] = (int) round(microtime(true) * 1000) - $startMs;

        $this->writeImportLog($log, $userId, $uploadedBy, $date);

        return $log;
    }

    /**
     * Write a per-file ImportLog record.
     * Wrapped in its own try/catch so a logging failure never breaks the import response.
     */
    private function writeImportLog(array $log, ?int $userId, ?string $uploadedBy, string $date): void
    {
        try {
            ImportLog::create([
                'branch'         => $log['branch'],
                'report_type'    => $log['key'],
                'report_date'    => $date,
                'uploaded_by'    => $uploadedBy ?? 'system',
                'user_id'        => $userId,
                'files_uploaded' => [$log['key']],
                'rows_imported'  => $log['inserted'],
                'rows_skipped'   => $log['skipped'],
                'rows_errored'   => $log['errors'],
                'period_from'    => $date,
                'period_to'      => $date,
                'duration_ms'    => $log['duration_ms'],
                'status'         => $log['success'] ? 'success' : ($log['rows_read'] === 0 ? 'skipped' : 'failed'),
                'notes'          => json_encode([
                    'file_name'    => $log['file_name'],
                    'billing_date' => $log['billing_date'],
                    'rows_read'    => $log['rows_read'],
                    'rows_deleted' => $log['deleted'],
                    'rows_inserted'=> $log['inserted'],
                    'rows_skipped' => $log['skipped'],
                    'error'        => $log['error_message'],
                ], JSON_UNESCAPED_UNICODE),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to write ImportLog', ['error' => $e->getMessage(), 'log' => $log]);
        }
    }

    /**
     * Force-delete (permanent) rows for a specific date only.
     * Used by the rollback endpoint where no CSV is available to scan.
     * forceDelete() bypasses SoftDeletes so rows are physically removed.
     */
    public function deleteForBranchDate(Branch $branch, string $date): void
    {
        $b = $branch->value;

        BillItem::where('branch', $b)->whereDate('bill_date', $date)->forceDelete();
        CashierCollection::where('branch', $b)->whereDate('collection_date', $date)->forceDelete();
        ErAdmission::where('branch', $b)->whereDate('admission_date', $date)->forceDelete();
        IpAdmission::where('branch', $b)->whereDate('admission_date', $date)->forceDelete();
        Surgery::where('branch', $b)->whereDate('surgery_date', $date)->forceDelete();

        if ($branch === Branch::CHROMEPET) {
            PackageConsumption::where('branch', $b)->whereDate('consumption_date', $date)->forceDelete();
        }
    }

    /**
     * Count data rows in a CSV file (header excluded).
     * Returns 0 if the file cannot be opened or has no data rows.
     */
    private function countCsvRows(string $path): int
    {
        $handle = @fopen($path, 'r');
        if (!$handle) return 0;

        fgetcsv($handle); // skip header

        $count = 0;
        while (($row = fgetcsv($handle)) !== false) {
            if (array_filter($row, fn($v) => trim((string) $v) !== '')) {
                $count++;
            }
        }

        fclose($handle);
        return $count;
    }
}
