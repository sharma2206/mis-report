<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\PackageConsumption;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class PackageConsumptionImport implements ToCollection, WithHeadingRow, WithChunkReading
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
            // Try 'amount' first, fallback to 'value' for flexibility
            $amount = (float) ($row['amount'] ?? $row['value'] ?? 0);

            // Skip rows with no meaningful amount
            if ($amount == 0) {
                continue;
            }

            $insert[] = [
                'branch'           => $this->branch->value,
                'consumption_date' => $this->date,
                'amount'           => $amount,
                'created_at'       => now(),
                'updated_at'       => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                PackageConsumption::insert($chunk);
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
}
