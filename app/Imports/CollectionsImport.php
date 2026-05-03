<?php

namespace App\Imports;

use App\Models\Collection as CollectionModel;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class CollectionsImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    public function __construct(private string $reportDate) {}

    public function collection(Collection $rows): void
    {
        $insert = [];
        foreach ($rows as $row) {
            if (empty($row['receipt_no']) && empty($row['bill_no'])) {
                continue;
            }

            $insert[] = [
                'report_date'  => $this->reportDate,
                'receipt_no'   => $row['receipt_no'] ?? null,
                'bill_no'      => $row['bill_no'] ?? null,
                'patient_id'   => $row['patient_id'] ?? null,
                'patient_name' => $row['patient_name'] ?? null,
                'patient_type' => $this->normalizePatientType($row['patient_type'] ?? null),
                'payment_mode' => $row['payment_mode'] ?? null,
                'paid_amount'  => (float) ($row['paid_amount'] ?? 0),
                'cashier_name' => $row['cashier_name'] ?? null,
                'raw_data'     => json_encode($row->toArray()),
                'created_at'   => now(),
                'updated_at'   => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                CollectionModel::insert($chunk);
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
