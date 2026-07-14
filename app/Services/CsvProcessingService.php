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
use App\Models\PackageConsumption;
use App\Models\Surgery;
use App\Services\CachedAnalyticsService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class CsvProcessingService
{
    /**
     * Process uploaded CSV files for a given branch and date.
     *
     * Returns import row counts plus a `sources` map recording which optional
     * report types were included in this upload. DashboardKpiService reads
     * `sources` (persisted on the mis_reports row) to decide whether a KPI can
     * be calculated or must show "N/A (Source report not uploaded)".
     */
    public function process(
        Branch $branch,
        string $date,
        ?UploadedFile $billFile = null,
        ?UploadedFile $cashierFile = null,
        ?UploadedFile $packageFile = null,
        ?UploadedFile $erFile = null,
        ?UploadedFile $ipFile = null,
        ?UploadedFile $surgeryFile = null
    ): array {
        return DB::transaction(function () use ($branch, $date, $billFile, $cashierFile, $packageFile, $erFile, $ipFile, $surgeryFile) {

            // Detect the actual date range inside each CSV so we can wipe the full
            // range before re-importing, not just the single upload date.
            $billRange    = $billFile    ? $this->csvDateRange($billFile->getRealPath(), 'Bill Date Time') : null;
            $cashierRange = $cashierFile ? $this->csvDateRange($cashierFile->getRealPath(), 'Receipt/Refund Date Time') : null;
            $erRange      = $erFile  ? $this->csvDateRange($erFile->getRealPath(),  'Admission Date Time') : null;
            // Use Admission Date Time as primary — IP Conversion Date Time is only
            // populated for ER→IP conversions (minority of rows) and would miss
            // the full date span of direct IP admissions.
            $ipRange      = $ipFile  ? $this->csvDateRange($ipFile->getRealPath(),  'Admission Date Time') : null;
            $surgRange    = $surgeryFile ? $this->csvDateRange($surgeryFile->getRealPath(), 'Surgery Start Date and Time', 'Surgery Scheduled Date Time') : null;
            // Package consumption: detect date range from bill date column so re-uploads
            // covering multi-day ranges delete+replace the full span, not just the fallback date.
            $pkgRange     = ($branch === Branch::CHROMEPET && $packageFile)
                ? $this->csvDateRange($packageFile->getRealPath(), 'Bill Date Time', 'Consumption Date Time', 'Order Date Time')
                : null;

            $this->deleteForBranchRange($branch, $billRange, $cashierRange, $erRange, $ipRange, $surgRange, $pkgRange, $date);

            // Bust cache for every date in the range covered by the bill CSV (or cashier
            // range for single-file uploads that don't include a bill file).
            $primaryRange = $billRange ?? $cashierRange;
            if ($primaryRange) {
                $cur = \Carbon\Carbon::parse($primaryRange[0]);
                $end = \Carbon\Carbon::parse($primaryRange[1]);
                while ($cur->lte($end)) {
                    \App\Repositories\CachedMisRepository::bustFor($branch->value, $cur->toDateString());
                    $cur->addDay();
                }
            } else {
                \App\Repositories\CachedMisRepository::bustFor($branch->value, $date);
            }
            CachedAnalyticsService::bustForBranch($branch->value);

            // ── Core files (nullable for single-file imports) ─────────────────
            $billImport = null;
            if ($billFile) {
                try {
                    $billImport = new BillItemImport($branch, $date);
                    Excel::import($billImport, $billFile);
                } catch (\Throwable $e) {
                    throw new \RuntimeException('Bill item import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            $cashierImport = null;
            if ($cashierFile) {
                try {
                    $cashierImport = new CashierCollectionImport($branch, $date);
                    Excel::import($cashierImport, $cashierFile);
                } catch (\Throwable $e) {
                    throw new \RuntimeException('Cashier collection import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            // ── Chromepet: package consumption ────────────────────────────────
            $packageCount = 0;
            if ($branch === Branch::CHROMEPET && $packageFile) {
                try {
                    $packageImport = new PackageConsumptionImport($branch, $date);
                    Excel::import($packageImport, $packageFile);
                    $packageCount = $packageImport->rowCount;
                } catch (\Throwable $e) {
                    throw new \RuntimeException('Package consumption import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            // ── ER admissions ─────────────────────────────────────────────────
            $erImportCount = 0;
            if ($erFile) {
                try {
                    $erImport = new ErAdmissionImport($branch, $date);
                    Excel::import($erImport, $erFile);
                    $erImportCount = $erImport->rowCount;
                } catch (\Throwable $e) {
                    throw new \RuntimeException('ER admission import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            // ── IP admissions ─────────────────────────────────────────────────
            $ipImportCount = 0;
            if ($ipFile) {
                try {
                    $ipImport = new IpAdmissionImport($branch, $date);
                    Excel::import($ipImport, $ipFile);
                    $ipImportCount = $ipImport->rowCount;
                } catch (\Throwable $e) {
                    throw new \RuntimeException('IP admission import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            // ── Surgeries ─────────────────────────────────────────────────────
            $surgeryCount = 0;
            if ($surgeryFile) {
                try {
                    $surgImport = new SurgeryImport($branch, $date);
                    Excel::import($surgImport, $surgeryFile);
                    $surgeryCount = $surgImport->rowCount;
                } catch (\Throwable $e) {
                    throw new \RuntimeException('Surgery import failed: ' . $e->getMessage(), 0, $e);
                }
            }

            return [
                // Row import counts
                'bill_items'           => $billImport?->rowCount ?? 0,
                'cashier_collections'  => $cashierImport?->rowCount ?? 0,
                'package_consumptions' => $packageCount,
                'er_admissions'        => $erImportCount,
                'ip_admissions'        => $ipImportCount,
                'surgeries'            => $surgeryCount,

                // Which reports were part of this upload — persisted on the
                // mis_reports row so DashboardKpiService can gate KPI availability later.
                'sources' => [
                    'bill'    => $billFile !== null,
                    'cashier' => $cashierFile !== null,
                    'package' => $branch === Branch::CHROMEPET && $packageFile !== null,
                    'er'      => $erFile !== null,
                    'ip'      => $ipFile !== null,
                    'surgery' => $surgeryFile !== null,
                ],
            ];
        });
    }

    /**
     * Delete rows for a specific date only.
     * Used by the rollback endpoint where no CSV is available to scan.
     */
    public function deleteForBranchDate(Branch $branch, string $date): void
    {
        BillItem::where('branch', $branch->value)->whereDate('bill_date', $date)->delete();
        CashierCollection::where('branch', $branch->value)->whereDate('collection_date', $date)->delete();
        ErAdmission::where('branch', $branch->value)->whereDate('admission_date', $date)->delete();
        IpAdmission::where('branch', $branch->value)->whereDate('admission_date', $date)->delete();
        Surgery::where('branch', $branch->value)->whereDate('surgery_date', $date)->delete();

        if ($branch === Branch::CHROMEPET) {
            PackageConsumption::where('branch', $branch->value)->whereDate('consumption_date', $date)->delete();
        }
    }

    /**
     * Delete rows across the full date range detected inside each CSV.
     * Called before every import so that re-uploading a monthly CSV fully
     * replaces the old data instead of leaving stale rows from prior uploads.
     */
    private function deleteForBranchRange(
        Branch $branch,
        ?array $billRange,
        ?array $cashierRange,
        ?array $erRange,
        ?array $ipRange,
        ?array $surgRange,
        ?array $pkgRange,
        string $fallbackDate
    ): void {
        $b = $branch->value;

        $del = fn($model, $col, $range) =>
            $range
                ? $model::where('branch', $b)->whereDate($col, '>=', $range[0])->whereDate($col, '<=', $range[1])->delete()
                : $model::where('branch', $b)->whereDate($col, $fallbackDate)->delete();

        $del(BillItem::class,          'bill_date',       $billRange);
        $del(CashierCollection::class, 'collection_date', $cashierRange);
        $del(ErAdmission::class,       'admission_date',  $erRange);
        $del(IpAdmission::class,       'admission_date',  $ipRange);
        $del(Surgery::class,           'surgery_date',    $surgRange);

        if ($branch === Branch::CHROMEPET) {
            $del(PackageConsumption::class, 'consumption_date', $pkgRange);
        }
    }

    /**
     * Scan the first few thousand rows of a CSV to find the earliest and latest
     * dates in the given column(s). Returns [minDate, maxDate] as Y-m-d strings,
     * or null if no parseable dates are found.
     */
    private function csvDateRange(string $path, string ...$columnNames): ?array
    {
        $handle = @fopen($path, 'r');
        if (!$handle) return null;

        $rawHeaders = fgetcsv($handle);
        if (!$rawHeaders) { fclose($handle); return null; }

        // Build a normalised header → index map
        $normalize = fn($s) => strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($s)));
        $hmap = [];
        foreach ($rawHeaders as $i => $h) {
            $hmap[$normalize($h)] = $i;
        }

        // Resolve column indices (try each candidate column name in order)
        $colIdx = null;
        foreach ($columnNames as $name) {
            $key = $normalize($name);
            if (isset($hmap[$key])) { $colIdx = $hmap[$key]; break; }
        }
        if ($colIdx === null) { fclose($handle); return null; }

        $min = null; $max = null; $scanned = 0;
        while (($row = fgetcsv($handle)) !== false && $scanned < 50000) {
            $scanned++;
            $raw = trim($row[$colIdx] ?? '');
            if (!$raw) continue;

            try {
                $d = \Carbon\Carbon::createFromFormat('d/m/Y, h:i a', $raw)->format('Y-m-d');
            } catch (\Exception) {
                try { $d = \Carbon\Carbon::parse($raw)->format('Y-m-d'); }
                catch (\Exception) { continue; }
            }

            if ($min === null || $d < $min) $min = $d;
            if ($max === null || $d > $max) $max = $d;
        }
        fclose($handle);

        return ($min && $max) ? [$min, $max] : null;
    }
}
