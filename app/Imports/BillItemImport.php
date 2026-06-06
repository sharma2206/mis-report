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

            $amount = (float) $this->getValue($row, ['amount', 'amt', 'total_amount']);

            // Try to get net_amount, defaulting to null if not found
            $netAmountRaw = $this->getValue($row, ['net_amount', 'net amount', 'netamount', 'net-amount'], null);

            // Also try to get discount amount if net_amount is missing
            $discountRaw = $this->getValue($row, ['discount', 'disc', 'discount_amount', 'discount amount'], null);

            if ($netAmountRaw !== null && trim((string)$netAmountRaw) !== '') {
                $netAmount = (float) $netAmountRaw;
            } elseif ($discountRaw !== null && trim((string)$discountRaw) !== '') {
                $netAmount = $amount - (float) $discountRaw;
            } else {
                $netAmount = $amount; // Default to amount if neither net_amount nor discount is provided
            }

            $insert[] = [
                'branch'         => $this->branch->value,
                'bill_date'      => $this->date,
                'patient_id'     => trim($row['patient_id'] ?? ''),
                'patient_type'   => $this->normalizePatientType($row['patient_type'] ?? null),
                'service_type'   => trim($row['service_type'] ?? ''),
                'sub_department' => trim($row['sub_department'] ?? '') ?: null,
                'amount'         => $amount,
                'net_amount'     => $netAmount,
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
     * Try multiple possible header keys and return the first non-empty value.
     *
     * @param array $row
     * @param array $keys
     * @return mixed
     */
    private function getValue($row, array $keys, $default = 0)
    {
        if ($row instanceof \Illuminate\Support\Collection) {
            $row = $row->all();
        }

        foreach ($keys as $k) {
            if (is_array($row) && array_key_exists($k, $row) && trim((string)($row[$k] ?? '')) !== '') {
                return $row[$k];
            }
        }

        // try normalized keys (lower, spaces/underscores/dashes)
        $normalized = [];
        if (is_array($row)) {
            foreach ($row as $rk => $rv) {
                $key = strtolower(str_replace([' ', '-', '_'], '', $rk));
                $normalized[$key] = $rv;
            }
        }
        foreach ($keys as $k) {
            $nk = strtolower(str_replace([' ', '-', '_'], '', $k));
            if (array_key_exists($nk, $normalized) && trim((string)$normalized[$nk]) !== '') {
                return $normalized[$nk];
            }
        }

        return $default;
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
