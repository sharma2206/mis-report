<?php

namespace App\Services;

use App\Imports\BillItemImport;
use App\Imports\BillItemsImport;
use App\Imports\CollectionImport;
use App\Imports\CollectionsImport;
use App\Imports\PackageConsumptionImport;
use App\Imports\PackageConsumptionsImport;
use App\Models\BillItem;
use App\Models\Collection;
use App\Models\PackageConsumption;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class CsvUploadService
{
    public function process(string $date, UploadedFile $bill, UploadedFile $collection, UploadedFile $package): void
    {
        DB::transaction(function () use ($date, $bill, $collection, $package) {

            // Prevent duplicate processing — wipe existing for date
            BillItem::where('report_date', $date)->delete();
            Collection::where('report_date', $date)->delete();
            PackageConsumption::where('report_date', $date)->delete();

            Excel::import(new BillItemsImport($date), $bill);
            Excel::import(new CollectionsImport($date), $collection);
            Excel::import(new PackageConsumptionsImport($date), $package);
        });
    }
}
