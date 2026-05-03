<?php

namespace App\Imports;

use App\Models\PackageConsumption;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class PackageConsumptionImports implements ToCollection, WithHeadingRow, WithChunkReading
{
    public function __construct(private string $reportDate) {}

    public function collection(Collection $rows): void
    {
        $insert = [];
        foreach ($rows as $row) {
            if (empty($row['package_name']) && empty($row['item_name'])) {
                continue;
            }

            $insert[] = [
                'report_date'  => $this->reportDate,
                'package_name' => $row['package_name'] ?? null,
                'patient_id'   => $row['patient_id'] ?? null,
                'patient_name' => $row['patient_name'] ?? null,
                'patient_type' => strtoupper(trim($row['patient_type'] ?? '')) ?: null,
                'service_type' => $row['service_type'] ?? null,
                'item_name'    => $row['item_name'] ?? null,
                'quantity'     => (float) ($row['quantity'] ?? 0),
                'rate'         => (float) ($row['rate'] ?? 0),
                'value'        => (float) ($row['value'] ?? 0),
                'raw_data'     => json_encode($row->toArray()),
                'created_at'   => now(),
                'updated_at'   => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                PackageConsumption::insert($chunk);
            }
        }
    }

    public function chunkSize(): int
    {
        return 1000;
    }
}
