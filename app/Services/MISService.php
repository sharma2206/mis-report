<?php

namespace App\Services;

use App\Imports\BillItemImports;
use App\Imports\CollectionsImport;
use App\Imports\PackageConsumptionImports;
use App\Models\BillItem;
use App\Models\Collection;
use App\Models\MisReport;
use App\Models\PackageConsumption;
use App\Repositories\Contracts\MisRepositoryInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class MISService
{
    public function __construct(private MisRepositoryInterface $repo) {}

    /**
     * Store uploaded files and create a pending MIS report.
     */
    public function storeUploads(string $date, UploadedFile $bill, UploadedFile $collection, UploadedFile $package, array $operational = []): MisReport
    {
        $existing = MisReport::where('report_date', $date)->first();

        if ($existing && $existing->status === MisReport::STATUS_COMPLETED) {
            throw new \DomainException("MIS Report for {$date} already processed.");
        }

        return DB::transaction(function () use ($date, $bill, $collection, $package, $existing, $operational) {
            // Clean any partial data for this date
            BillItem::where('report_date', $date)->delete();
            Collection::where('report_date', $date)->delete();
            PackageConsumption::where('report_date', $date)->delete();

            // Save uploaded files for re-processing/audit
            $billPath       = $bill->storeAs("mis/{$date}", "bill_{$date}.csv");
            $collectionPath = $collection->storeAs("mis/{$date}", "collection_{$date}.csv");
            $packagePath    = $package->storeAs("mis/{$date}", "package_{$date}.csv");

            $report = $existing ?? new MisReport(['report_date' => $date]);
            $report->status        = MisReport::STATUS_PENDING;
            $report->error_message = null;
            if (!empty($operational)) {
                $report->occupancy = $operational['occupancy'] ?? null;
                $report->occupancy_percent = $operational['occupancy_percent'] ?? null;
                $report->admission = $operational['admission'] ?? null;
                $report->discharge = $operational['discharge'] ?? null;
            }
            $report->save();

            // Import data into normalized tables
            Excel::import(new BillItemImports($date), storage_path("app/private/{$billPath}"));
            Excel::import(new CollectionsImport($date), storage_path("app/private/{$collectionPath}"));
            Excel::import(new PackageConsumptionImports($date), storage_path("app/private/{$packagePath}"));

            return $report;
        });
    }

    /**
     * Generate the MIS Report from previously imported data.
     */
    public function generate(string $date): MisReport
    {
        $report = MisReport::firstOrCreate(['report_date' => $date]);

        try {
            $report->update(['status' => MisReport::STATUS_PROCESSING]);

            // 1. SALES
            $sales         = $this->repo->salesByPatientType($date);
            $pharmacySales = $this->repo->pharmacySales($date);
            $pharmacyPkg   = $this->repo->pharmacyPackageValue($date);
            $finalPharmacy = $pharmacySales + $pharmacyPkg;

            $salesTotal = $sales['op'] + $sales['ip'] + $sales['er'];

            // 2. COLLECTION
            $collection      = $this->repo->collectionByPatientType($date);
            $collectionTotal = $collection['op'] + $collection['ip'] + $collection['er'];

            // 3. DISCOUNT
            $discount100 = $this->repo->discount100($date);
            $discount99  = $this->repo->discount99($date);

            // 4. REFUND
            $refund = $this->repo->refundTotal($date);

            // 5. MRI
            $mri = $this->repo->mriMetrics($date);

            // 6. OP Count
            $totalOp = $this->repo->totalOpCount($date);

            // 7. Operational metrics (manual inputs preferred over fallback)
            $operational = [
                'occupancy'         => $report->occupancy ?? 0,
                'occupancy_percent' => $report->occupancy_percent ?? 0.0,
                'admission'         => $report->admission ?? 0,
                'discharge'         => $report->discharge ?? 0,
            ];
            
            // If completely empty, try fallback
            if (empty(array_filter($operational))) {
                $operational = $this->computeOperationalMetrics($date);
            }

            $payload = [
                'sales' => [
                    'op'    => round($sales['op'], 2),
                    'ip'    => round($sales['ip'], 2),
                    'er'    => round($sales['er'], 2),
                    'ph'    => round($finalPharmacy, 2),
                    'total' => round($salesTotal, 2),
                ],
                'collection' => [
                    'op'    => round($collection['op'], 2),
                    'ip'    => round($collection['ip'], 2),
                    'er'    => round($collection['er'], 2),
                    'total' => round($collectionTotal, 2),
                ],
                'discount' => [
                    'd99'  => round($discount99, 2),
                    'd100' => round($discount100, 2),
                ],
                'refund' => round($refund, 2),
                'mri'    => $mri,
                'total_op'    => $totalOp,
                'operational' => $operational,
            ];

            $report->update([
                'status'           => MisReport::STATUS_COMPLETED,
                'sales_op'         => $sales['op'],
                'sales_ip'         => $sales['ip'],
                'sales_er'         => $sales['er'],
                'sales_pharmacy'   => $finalPharmacy,
                'sales_total'      => $salesTotal,
                'collection_op'    => $collection['op'],
                'collection_ip'    => $collection['ip'],
                'collection_er'    => $collection['er'],
                'collection_total' => $collectionTotal,
                'discount_99'      => $discount99,
                'discount_100'     => $discount100,
                'refund'           => $refund,
                'mri_op_count'     => $mri['op_count'],
                'mri_ip_count'     => $mri['ip_count'],
                'mri_op_revenue'   => $mri['op_revenue'],
                'mri_ip_revenue'   => $mri['ip_revenue'],
                'total_op'         => $totalOp,
                'occupancy'        => $operational['occupancy'],
                'occupancy_percent'=> $operational['occupancy_percent'],
                'admission'        => $operational['admission'],
                'discharge'        => $operational['discharge'],
                'payload'          => $payload,
                'processed_at'     => now(),
            ]);

            Log::info("MIS Report generated successfully for {$date}");
            return $report->fresh();
        } catch (\Throwable $e) {
            Log::error("MIS Report generation failed for {$date}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            $report->update([
                'status'        => MisReport::STATUS_FAILED,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Operational metrics. In production, integrate with HIS API.
     */
    private function computeOperationalMetrics(string $date): array
    {
        $bedCapacity = (int) config('mis.bed_capacity', 200);

        // Distinct IP patients with billable items considered as occupied
        $occupancy = BillItem::forDate($date)
            ->where('patient_type', 'IP')
            ->distinct('patient_id')
            ->count('patient_id');

        $occupancyPercent = $bedCapacity > 0
            ? round(($occupancy / $bedCapacity) * 100, 2)
            : 0.0;

        // Heuristic placeholders. Replace with actual HIS data.
        $admission = $occupancy;
        $discharge = (int) round($occupancy * 0.4);

        return [
            'occupancy'         => $occupancy,
            'occupancy_percent' => $occupancyPercent,
            'admission'         => $admission,
            'discharge'         => $discharge,
        ];
    }

    public function getReport(string $date): ?MisReport
    {
        return MisReport::where('report_date', $date)->first();
    }
}
