<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\ErAdmission;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class ErAdmissionImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    public int $rowCount = 0;

    public function __construct(
        private Branch $branch,
        private string $date
    ) {}

    public function collection(Collection $rows): void
    {
        $insert = [];

        foreach ($rows as $row) {
            $admissionNo = trim($row['admission_no'] ?? '');
            $uhid        = trim($row['uhid'] ?? '');

            if (empty($admissionNo) && empty($uhid)) {
                continue;
            }

            $insert[] = [
                'branch'              => $this->branch->value,
                'admission_date'      => $this->parseDateOnly($row['admission_date_time'] ?? null) ?? $this->date,
                'admission_no'        => $admissionNo ?: null,
                'uhid'                => $uhid ?: null,
                'patient_name'        => trim($row['patient_name'] ?? '') ?: null,
                'age'                 => trim($row['age'] ?? '') ?: null,
                'gender'              => trim($row['gender'] ?? '') ?: null,
                'admission_type'      => trim($row['admission_type'] ?? '') ?: null,
                'status'              => trim($row['status'] ?? '') ?: null,
                'doctor_name'         => trim($this->getValue($row, ['doctor_name_team', 'doctor_nameteam', 'doctor_name'], '')) ?: null,
                'doctor_speciality'   => trim($this->getValue($row, ['doctor_speciality_unit_type', 'doctor_specialityunit_type', 'doctor_speciality'], '')) ?: null,
                'treating_department' => trim($row['treating_department'] ?? '') ?: null,
                'ward'                => trim($row['ward'] ?? '') ?: null,
                'bed'                 => trim($row['bed'] ?? '') ?: null,
                'payer_type'          => strtolower(trim($row['payer_type'] ?? '')) ?: null,
                'payer_name'          => trim($row['payer_name'] ?? '') ?: null,
                'payer_group'         => trim($row['payer_group'] ?? '') ?: null,
                'billing_category'    => trim($row['billing_category'] ?? '') ?: null,
                'high_risk'           => strtolower(trim($row['high_risk'] ?? '')) === 'yes',
                'mlc'                 => strtolower(trim($row['mlc'] ?? '')) === 'yes',
                'short_stay'          => strtolower(trim($row['short_stay'] ?? '')) === 'yes',
                'discharge_type'      => trim($row['discharge_type'] ?? '') ?: null,
                'discharge_date'      => $this->parseDateTime($row['discharge_date_time'] ?? null),
                'actual_los'          => $this->parseNumeric($this->getValue($row, ['actual_los_in_days', 'actual_l_o_s_in_days'], null)),
                'created_at'          => now(),
                'updated_at'          => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                ErAdmission::insert($chunk);
            }
            $this->rowCount += count($insert);
        }
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    private function getValue($row, array $keys, $default = '')
    {
        if ($row instanceof \Illuminate\Support\Collection) {
            $row = $row->all();
        }

        foreach ($keys as $k) {
            if (is_array($row) && array_key_exists($k, $row) && trim((string)($row[$k] ?? '')) !== '') {
                return $row[$k];
            }
        }

        $normalized = [];
        if (is_array($row)) {
            foreach ($row as $rk => $rv) {
                $key = strtolower(str_replace([' ', '-', '_', '/', '.', '(', ')'], '', $rk));
                $normalized[$key] = $rv;
            }
        }
        foreach ($keys as $k) {
            $nk = strtolower(str_replace([' ', '-', '_', '/', '.', '(', ')'], '', $k));
            if (array_key_exists($nk, $normalized) && trim((string)$normalized[$nk]) !== '') {
                return $normalized[$nk];
            }
        }

        return $default;
    }

    private function parseDateOnly($value): ?string
    {
        if (!$value || trim((string) $value) === '') {
            return null;
        }
        try {
            return Carbon::createFromFormat('d/m/Y, h:i a', trim((string) $value))->format('Y-m-d');
        } catch (\Exception) {
            try {
                return Carbon::parse($value)->format('Y-m-d');
            } catch (\Exception) {
                return null;
            }
        }
    }

    private function parseDateTime(?string $value): ?string
    {
        if (!$value || trim($value) === '') {
            return null;
        }

        try {
            // Handle format: "21/06/2026, 09:09 pm"
            return Carbon::createFromFormat('d/m/Y, h:i a', trim($value))->format('Y-m-d H:i:s');
        } catch (\Exception) {
            try {
                return Carbon::parse($value)->format('Y-m-d H:i:s');
            } catch (\Exception) {
                return null;
            }
        }
    }

    private function parseNumeric(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $cleaned = str_replace(',', '', trim((string) $value));

        return is_numeric($cleaned) ? (float) $cleaned : null;
    }
}
