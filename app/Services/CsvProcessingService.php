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
     * Required: bill_file + cashier_file
     * Chromepet only: package_file
     * Optional (all branches): er_file, ip_file, surgery_file
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

            $billImport = new BillItemImport($branch, $date);
            Excel::import($billImport, $billFile);

            $cashierImport = new CashierCollectionImport($branch, $date);
            Excel::import($cashierImport, $cashierFile);

            $packageCount = 0;
            if ($branch === Branch::CHROMEPET && $packageFile) {
                $packageImport = new PackageConsumptionImport($branch, $date);
                Excel::import($packageImport, $packageFile);
                $packageCount = $packageImport->rowCount;
            }

            $erCount = 0;
            if ($erFile) {
                $erImport = new ErAdmissionImport($branch, $date);
                Excel::import($erImport, $erFile);
                $erCount = $erImport->rowCount;
            }

            $ipCount = 0;
            if ($ipFile) {
                $ipImport = new IpAdmissionImport($branch, $date);
                Excel::import($ipImport, $ipFile);
                $ipCount = $ipImport->rowCount;
            }

            $surgeryCount = 0;
            if ($surgeryFile) {
                $surgImport = new SurgeryImport($branch, $date);
                Excel::import($surgImport, $surgeryFile);
                $surgeryCount = $surgImport->rowCount;
            }

            return [
                'bill_items'           => $billImport->rowCount,
                'cashier_collections'  => $cashierImport->rowCount,
                'package_consumptions' => $packageCount,
                'er_admissions'        => $erCount,
                'ip_admissions'        => $ipCount,
                'surgeries'            => $surgeryCount,
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
