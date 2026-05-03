<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\BillItem;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class BillItemImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    /**
     * @var int Track total rows imported
     */
    public int $rowCount = 0;

    /**
     * @param Branch $branch
     * @param string $date
     */
    public function __construct(
        private Branch $branch,
        private string $date
    ) {}

    /**
     * Process each chunk of rows from the CSV.
     *
     * @param Collection $rows
     * @return void
     */
    public function collection(Collection $rows): void
    {
        $insert = [];

        foreach ($rows as $row) {
            // Skip empty rows
            if (empty($row['patient_id']) && empty($row['bill_no'])) {
                continue;
            }

            $insert[] = [
                'branch'         => $this->branch->value,
                'bill_date'      => $this->date,
                'patient_id'     => trim($row['patient_id'] ?? ''),
                'patient_type'   => $this->normalizePatientType($row['patient_type'] ?? null),
                'service_type'   => trim($row['service_type'] ?? ''),
                'sub_department' => trim($row['sub_department'] ?? '') ?: null,
                'amount'         => (float) ($row['amount'] ?? 0),
                'net_amount'     => (float) ($row['net_amount'] ?? 0),
                'quantity'       => (int) ($row['quantity'] ?? 1),
                'status'         => trim($row['status'] ?? 'Active') ?: 'Active',
                'created_at'     => now(),
                'updated_at'     => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                BillItem::insert($chunk);
            }
            $this->rowCount += count($insert);
        }
    }

    /**
     * @return int
     */
    public function chunkSize(): int
    {
        return 1000;
    }

    /**
     * Normalize patient type to OP, IP, ER, or null (Pharmacy).
     *
     * @param string|null $type
     * @return string|null
     */
    private function normalizePatientType(?string $type): ?string
    {
        if (!$type || trim($type) === '') {
            return null;
        }

        $t = strtoupper(trim($type));

        return match (true) {
            str_contains($t, 'OP')                              => 'OP',
            str_contains($t, 'IP'), str_contains($t, 'INPATIENT') => 'IP',
            str_contains($t, 'ER'), str_contains($t, 'EMERGENCY') => 'ER',
            default                                              => $t,
        };
    }
}
