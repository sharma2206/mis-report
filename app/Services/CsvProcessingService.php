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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class CsvProcessingService
{
    /**
     * Process uploaded CSV files for a given branch and date.
     *
     * Returns import row counts PLUS derived volume indicators so the controller
     * can pass them to MISService without requiring manual form input.
     *
     *   derived.admission  — count of IP admissions for this branch+date (from ip_admissions)
     *   derived.discharge  — count of IP discharges on this date  (discharge_date = date)
     *   derived.er_count   — count of ER visits for this branch+date (from er_admissions)
     *   derived.sources    — which fields were auto-derived vs still manual
     */
    public function process(
        Branch $branch,
        string $date,
        UploadedFile $billFile,
        UploadedFile $cashierFile,
        ?UploadedFile $packageFile = null,
        ?UploadedFile $erFile = null,
        ?UploadedFile $ipFile = null,
        ?UploadedFile $surgeryFile = null
    ): array {
        return DB::transaction(function () use ($branch, $date, $billFile, $cashierFile, $packageFile, $erFile, $ipFile, $surgeryFile) {

            $this->deleteExisting($branch, $date);
            \App\Repositories\CachedMisRepository::bustFor($branch->value, $date);

            // ── Core files ────────────────────────────────────────────────────
            $billImport = new BillItemImport($branch, $date);
            Excel::import($billImport, $billFile);

            $cashierImport = new CashierCollectionImport($branch, $date);
            Excel::import($cashierImport, $cashierFile);

            // ── Chromepet: package consumption ────────────────────────────────
            $packageCount = 0;
            if ($branch === Branch::CHROMEPET && $packageFile) {
                $packageImport = new PackageConsumptionImport($branch, $date);
                Excel::import($packageImport, $packageFile);
                $packageCount = $packageImport->rowCount;
            }

            // ── ER admissions ─────────────────────────────────────────────────
            $erImportCount   = 0;
            $erCountDerived  = false;
            if ($erFile) {
                $erImport = new ErAdmissionImport($branch, $date);
                Excel::import($erImport, $erFile);
                $erImportCount  = $erImport->rowCount;
                $erCountDerived = true;
            }

            // ── IP admissions ─────────────────────────────────────────────────
            $ipImportCount       = 0;
            $admissionDerived    = false;
            $dischargeDerived    = false;
            if ($ipFile) {
                $ipImport = new IpAdmissionImport($branch, $date);
                Excel::import($ipImport, $ipFile);
                $ipImportCount    = $ipImport->rowCount;
                $admissionDerived = true;
                $dischargeDerived = true;
            }

            // ── Surgeries ─────────────────────────────────────────────────────
            $surgeryCount = 0;
            if ($surgeryFile) {
                $surgImport = new SurgeryImport($branch, $date);
                Excel::import($surgImport, $surgeryFile);
                $surgeryCount = $surgImport->rowCount;
            }

            // ── Derive volume indicators from freshly imported data ───────────
            $derivedAdmission = $admissionDerived
                ? IpAdmission::where('branch', $branch->value)
                    ->whereDate('admission_date', $date)
                    ->count()
                : null;

            $derivedDischarge = $dischargeDerived
                ? IpAdmission::where('branch', $branch->value)
                    ->whereDate('discharge_date', $date)
                    ->count()
                : null;

            $derivedErCount = $erCountDerived
                ? ErAdmission::where('branch', $branch->value)
                    ->whereDate('admission_date', $date)
                    ->count()
                : null;

            return [
                // Row import counts
                'bill_items'           => $billImport->rowCount,
                'cashier_collections'  => $cashierImport->rowCount,
                'package_consumptions' => $packageCount,
                'er_admissions'        => $erImportCount,
                'ip_admissions'        => $ipImportCount,
                'surgeries'            => $surgeryCount,

                // Derived volume indicators (null = not available, must use manual value)
                'derived' => [
                    'admission'  => $derivedAdmission,
                    'discharge'  => $derivedDischarge,
                    'er_count'   => $derivedErCount,
                    'sources'    => [
                        'admission' => $admissionDerived ? 'ip_file'  : 'manual',
                        'discharge' => $dischargeDerived ? 'ip_file'  : 'manual',
                        'er_count'  => $erCountDerived   ? 'er_file'  : 'manual',
                    ],
                ],
            ];
        });
    }

    private function deleteExisting(Branch $branch, string $date): void
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
}
