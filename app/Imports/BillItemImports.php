<?php

namespace App\Imports;

use App\Models\BillItem;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class BillItemImports implements ToCollection, WithHeadingRow, WithChunkReading
{
    public function __construct(private string $reportDate) {}

    public function collection(Collection $rows): void
    {
        $insert = [];
        foreach ($rows as $row) {
            if (empty($row['bill_no']) && empty($row['patient_id'])) {
                continue;
            }

            $insert[] = [
                'report_date'    => $this->reportDate,
                'bill_no'        => $row['bill_no'] ?? null,
                'patient_id'     => $row['patient_id'] ?? null,
                'patient_name'   => $row['patient_name'] ?? null,
                'patient_type'   => $this->normalizePatientType($row['patient_type'] ?? null),
                'service_type'   => $row['service_type'] ?? null,
                'sub_department' => $row['sub_department'] ?? null,
                'item_name'      => $row['item_name'] ?? null,
                'quantity'       => (float) ($row['quantity'] ?? 0),
                'rate'           => (float) ($row['rate'] ?? 0),
                'amount'         => (float) ($row['amount'] ?? 0),
                'discount'       => (float) ($row['discount'] ?? 0),
                'net_amount'     => (float) ($row['net_amount'] ?? 0),
                'status'         => $row['status'] ?? 'Active',
                'doctor_name'    => $row['doctor_name'] ?? null,
                'raw_data'       => json_encode($row->toArray()),
                'created_at'     => now(),
                'updated_at'     => now(),
            ];
        }

        if (!empty($insert)) {
            // Bulk insert in chunks to avoid memory issues
            foreach (array_chunk($insert, 500) as $chunk) {
                BillItem::insert($chunk);
            }
        }
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    private function normalizePatientType(?string $type): ?string
    {
        if (!$type) return null;

        $t = strtoupper(trim($type));
        return match (true) {
            str_contains($t, 'OP') => 'OP',
            str_contains($t, 'IP') => 'IP',
            str_contains($t, 'ER') || str_contains($t, 'EMERGENCY') => 'ER',
            default => $t,
        };
    }
}
