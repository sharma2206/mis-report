<?php

namespace App\Services;

use App\Enums\BillStatus;
use App\Enums\ServiceType;
use App\Enums\SubDepartment;
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
            BillItem::where('report_date', $date)->delete();
            Collection::where('report_date', $date)->delete();
            PackageConsumption::where('report_date', $date)->delete();

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

            Excel::import(new BillItemImports($date), storage_path("app/private/{$billPath}"));
            Excel::import(new CollectionsImport($date), storage_path("app/private/{$collectionPath}"));
            Excel::import(new PackageConsumptionImports($date), storage_path("app/private/{$packagePath}"));

            return $report;
        });
    }

    public function generateMIS(string $branch, string $date): array
    {
        $sales = (float) $this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->where('status', '!=', BillStatus::REFUND)
            ->sum('net_amount');

        $collection = (float) $this->applyBranchFilter(Collection::query()->forDate($date), $branch)
            ->sum('paid_amount');

        $discount99 = (float) $this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->where('net_amount', '!=', 0)
            ->where('discount', '>', 0)
            ->sum('discount');

        $discount100 = (float) $this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->where('net_amount', 0)
            ->where('amount', '>', 0)
            ->sum('amount');

        $refund = (float) abs($this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->where('status', BillStatus::REFUND)
            ->sum('net_amount'));

        $mriBase = $this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->where('sub_department', SubDepartment::MRI)
            ->where('status', '!=', BillStatus::REFUND);

        $mri = [
            'op_count' => (int) (clone $mriBase)->where('patient_type', 'OP')->distinct('patient_id')->count('patient_id'),
            'ip_count' => (int) (clone $mriBase)->where('patient_type', 'IP')->distinct('patient_id')->count('patient_id'),
            'op_revenue' => (float) (clone $mriBase)->where('patient_type', 'OP')->sum('net_amount'),
            'ip_revenue' => (float) (clone $mriBase)->where('patient_type', 'IP')->sum('net_amount'),
        ];

        $opCount = (int) $this->applyBranchFilter(BillItem::query()->forDate($date), $branch)
            ->ofServiceType(ServiceType::OP_CONSULTATION)
            ->where('status', '!=', BillStatus::REFUND)
            ->sum('quantity');

        $pharmacyConsumption = (float) $this->applyBranchFilter(PackageConsumption::query()->forDate($date), $branch)
            ->where('service_type', ServiceType::PHARMACY)
            ->sum('value');

        return [
            'branch' => $branch,
            'date' => $date,
            'sales' => round($sales, 2),
            'collection' => round($collection, 2),
            'discount' => [
                '99' => round($discount99, 2),
                '100' => round($discount100, 2),
            ],
            'refund' => round($refund, 2),
            'mri' => [
                'op_count' => $mri['op_count'],
                'ip_count' => $mri['ip_count'],
                'op_revenue' => round($mri['op_revenue'], 2),
                'ip_revenue' => round($mri['ip_revenue'], 2),
            ],
            'op_count' => $opCount,
            'package_consumption' => round($pharmacyConsumption, 2),
            'sql_notes' => [
                'sales' => "SELECT SUM(net_amount) FROM bill_items WHERE report_date = ? AND branch = ? AND status != 'Refund'",
                'collection' => "SELECT SUM(paid_amount) FROM collections WHERE report_date = ? AND branch = ?",
                'package_consumption' => "SELECT SUM(value) FROM package_consumptions WHERE report_date = ? AND branch = ? AND service_type = 'Pharmacy'",
            ],
        ];
    }

    private function applyBranchFilter($query, string $branch)
    {
        return $query->whereRaw(
            "LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.branch')), JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.location')), JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.branch_name')), '')) = LOWER(?)",
            [$branch]
        );
    }

    /** existing methods below */
    public function generate(string $date): MisReport
    {
        $report = MisReport::firstOrCreate(['report_date' => $date]);
        try {
            $report->update(['status' => MisReport::STATUS_PROCESSING]);
            $sales         = $this->repo->salesByPatientType($date);
            $pharmacySales = $this->repo->pharmacySales($date);
            $pharmacyPkg   = $this->repo->pharmacyPackageValue($date);
            $finalPharmacy = $pharmacySales + $pharmacyPkg;
            $salesTotal = $sales['op'] + $sales['ip'] + $sales['er'];
            $collection      = $this->repo->collectionByPatientType($date);
            $collectionTotal = $collection['op'] + $collection['ip'] + $collection['er'];
            $discount100 = $this->repo->discount100($date);
            $discount99  = $this->repo->discount99($date);
            $refund = $this->repo->refundTotal($date);
            $mri = $this->repo->mriMetrics($date);
            $totalOp = $this->repo->totalOpCount($date);
            $operational = [
                'occupancy' => $report->occupancy ?? 0,
                'occupancy_percent' => $report->occupancy_percent ?? 0.0,
                'admission' => $report->admission ?? 0,
                'discharge' => $report->discharge ?? 0,
            ];
            if (empty(array_filter($operational))) {
                $operational = $this->computeOperationalMetrics($date);
            }
            $payload = [
                'sales' => ['op' => round($sales['op'], 2), 'ip' => round($sales['ip'], 2), 'er' => round($sales['er'], 2), 'ph' => round($finalPharmacy, 2), 'total' => round($salesTotal, 2)],
                'collection' => ['op' => round($collection['op'], 2), 'ip' => round($collection['ip'], 2), 'er' => round($collection['er'], 2), 'total' => round($collectionTotal, 2)],
                'discount' => ['d99' => round($discount99, 2), 'd100' => round($discount100, 2)],
                'refund' => round($refund, 2),
                'mri' => $mri,
                'total_op' => $totalOp,
                'operational' => $operational,
            ];
            $report->update(['status' => MisReport::STATUS_COMPLETED, 'payload' => $payload, 'processed_at' => now()]);
            Log::info("MIS Report generated successfully for {$date}");
            return $report->fresh();
        } catch (\Throwable $e) {
            Log::error("MIS Report generation failed for {$date}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $report->update(['status' => MisReport::STATUS_FAILED, 'error_message' => $e->getMessage()]);
            throw $e;
        }
    }

    private function computeOperationalMetrics(string $date): array
    {
        $bedCapacity = (int) config('mis.bed_capacity', 200);
        $occupancy = BillItem::forDate($date)->where('patient_type', 'IP')->distinct('patient_id')->count('patient_id');
        $occupancyPercent = $bedCapacity > 0 ? round(($occupancy / $bedCapacity) * 100, 2) : 0.0;
        $admission = $occupancy;
        $discharge = (int) round($occupancy * 0.4);
        return ['occupancy' => $occupancy, 'occupancy_percent' => $occupancyPercent, 'admission' => $admission, 'discharge' => $discharge];
    }

    public function getReport(string $date): ?MisReport
    {
        return MisReport::where('report_date', $date)->first();
    }
}
