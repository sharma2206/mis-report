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
     * Returns import row counts plus a `sources` map recording which optional
     * report types were included in this upload. DashboardKpiService reads
     * `sources` (persisted on the mis_reports row) to decide whether a KPI can
     * be calculated or must show "N/A (Source report not uploaded)".
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
            try {
                $billImport = new BillItemImport($branch, $date);
                Excel::import($billImport, $billFile);
            } catch (\Throwable $e) {
                throw new \RuntimeException('Bill item import failed: ' . $e->getMessage(), 0, $e);
            }

            try {
                $cashierImport = new CashierCollectionImport($branch, $date);
                Excel::import($cashierImport, $cashierFile);
            } catch (\Throwable $e) {
                throw new \RuntimeException('Cashier collection import failed: ' . $e->getMessage(), 0, $e);
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
                'bill_items'           => $billImport->rowCount,
                'cashier_collections'  => $cashierImport->rowCount,
                'package_consumptions' => $packageCount,
                'er_admissions'        => $erImportCount,
                'ip_admissions'        => $ipImportCount,
                'surgeries'            => $surgeryCount,

                // Which optional reports were part of this upload — persisted on the
                // mis_reports row so DashboardKpiService can gate KPI availability later.
                'sources' => [
                    'bill'    => true,
                    'cashier' => true,
                    'package' => $branch === Branch::CHROMEPET && $packageFile !== null,
                    'er'      => $erFile !== null,
                    'ip'      => $ipFile !== null,
                    'surgery' => $surgeryFile !== null,
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
