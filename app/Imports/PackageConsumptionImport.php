<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\PackageConsumption;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class PackageConsumptionImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    public int $rowCount = 0;

    public function __construct(
        private Branch $branch,
        private string $date
    ) {}

    public function collection(Collection $rows): void
    {
        $insert = [];

        foreach ($rows as $index => $row) {
            if ($index === 0 && $this->rowCount === 0) {
                Log::info('PackageConsumptionImport first row keys:', array_keys($row->toArray()));
            }

            $serviceType = strtolower(trim($row['package_service_type'] ?? ''));
            if ($serviceType !== 'pharmacy') {
                continue;
            }

            $rawAmount = str_replace(',', '', $row['service_item_amount'] ?? '0');
            $amount    = (float) trim($rawAmount);


            // Package amount is the overall package price (used for adjustment calculation)
            $packageAmountRaw = str_replace(',', '', $row['package_amount'] ?? '0');
            $packageAmount    = (float) trim($packageAmountRaw);

            // Prefer the bill/consumption date from the CSV; fall back to the upload date.
            $consumptionDate = $this->parseDateOnly(
                $row['bill_date_time'] ?? $row['consumption_date_time'] ?? $row['order_date_time'] ?? null
            ) ?? $this->date;

            $insert[] = [
                'branch'               => $this->branch->value,
                'consumption_date'     => $consumptionDate,
                'uhid'                 => trim($row['uhid'] ?? '') ?: null,
                'patient_name'         => trim($row['patient_name'] ?? '') ?: null,
                'bill_no'              => trim($row['bill_no'] ?? '') ?: null,
                'patient_type'         => $this->normalizePatientType($row['patient_type'] ?? null),
                'payer_type'           => strtolower(trim($row['payer_type'] ?? '')) ?: null,
                'payer_name'           => trim($row['payer_name'] ?? '') ?: null,
                'package_type'         => trim($row['package_type'] ?? '') ?: null,
                'package_sub_type'     => trim($row['package_sub_type'] ?? '') ?: null,
                'package_name'         => trim($row['package_name'] ?? '') ?: null,
                'package_codes'        => trim($row['package_codes'] ?? '') ?: null,
                'department'           => trim($row['department'] ?? '') ?: null,
                'sub_department'       => trim($row['sub_department'] ?? '') ?: null,
                'billing_category'     => trim($row['billing_category'] ?? '') ?: null,
                'package_service_type' => trim($row['package_service_type'] ?? '') ?: null,
                'package_service_item' => trim($row['package_service_item'] ?? '') ?: null,
                'amount'               => round($amount, 2),
                'service_item_amount'  => round($amount, 2),
                'order_by'             => trim($row['order_by'] ?? '') ?: null,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                PackageConsumption::insert($chunk);
            }
            $this->rowCount += count($insert);
        }
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    private function parseDateOnly($value): ?string
    {
        if (!$value || trim((string) $value) === '') return null;
        try {
            return Carbon::createFromFormat('d/m/Y, h:i a', trim($value))->format('Y-m-d');
        } catch (\Exception) {
            try {
                return Carbon::parse(trim($value))->format('Y-m-d');
            } catch (\Exception) {
                return null;
            }
        }
    }

    private function normalizePatientType(?string $type): ?string
    {
        if (!$type || trim($type) === '') {
            return null;
        }

        $t = strtoupper(trim($type));

        return match (true) {
            str_contains($t, 'OP')                                   => 'OP',
            str_contains($t, 'IP'), str_contains($t, 'INPATIENT')    => 'IP',
            str_contains($t, 'ER'), str_contains($t, 'EMERGENCY')    => 'ER',
            default                                                   => $t,
        };
    }
}
