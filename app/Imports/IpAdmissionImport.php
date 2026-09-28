<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\IpAdmission;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class IpAdmissionImport implements ToCollection, WithHeadingRow, WithChunkReading
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
            $admissionNo = trim($this->getValue($row, ['admission_no', 'admission_no'], ''));
            $uhid        = trim($row['uhid'] ?? '');

            if (empty($admissionNo) && empty($uhid)) {
                continue;
            }

            $insert[] = [
                'branch'                     => $this->branch->value,
                'admission_date'             => $this->parseDateOnly($this->getValue($row, ['admission_date_time', 'ip_conversion_date_time'], null)) ?? $this->date,
                'admission_no'               => $admissionNo ?: null,
                'uhid'                       => $uhid ?: null,
                'patient_name'               => trim($row['patient_name'] ?? '') ?: null,
                'age'                        => trim($this->getValue($row, ['patient_age', 'age'], '')) ?: null,
                'gender'                     => trim($this->getValue($row, ['patient_gender', 'gender'], '')) ?: null,
                'admission_type'             => trim($row['admission_type'] ?? '') ?: null,
                'admission_source'           => trim($row['admission_source'] ?? '') ?: null,
                'status'                     => trim($row['status'] ?? '') ?: null,
                'treating_doctor'            => trim($this->getValue($row, ['treating_doctor_team', 'treating_doctorteam'], '')) ?: null,
                'treating_doctor_speciality' => trim($row['treating_doctor_speciality'] ?? '') ?: null,
                'treating_department'        => trim($row['treating_department'] ?? '') ?: null,
                'treating_sub_department'    => trim($row['treating_sub_department'] ?? '') ?: null,
                'admitting_doctor'           => trim($this->getValue($row, ['admitting_doctor_team', 'admitting_doctorteam'], '')) ?: null,
                'admitting_doctor_speciality'=> trim($row['admitting_doctor_speciality'] ?? '') ?: null,
                'admitting_department'       => trim($row['admitting_department'] ?? '') ?: null,
                'ward'                       => trim($this->getValue($row, ['current_ward', 'admitting_ward', 'ward'], '')) ?: null,
                'room'                       => trim($row['room'] ?? '') ?: null,
                'payer_type'                 => strtolower(trim($row['payer_type'] ?? '')) ?: null,
                'payer_name'                 => trim($row['payer_name'] ?? '') ?: null,
                'payer_group'                => trim($row['payer_group'] ?? '') ?: null,
                'billing_category'           => trim($row['billing_category'] ?? '') ?: null,
                'high_risk'                  => strtolower(trim($row['high_risk'] ?? '')) === 'yes',
                'mlc'                        => strtolower(trim($row['mlc'] ?? '')) === 'yes',
                'discharge_type'             => trim($row['discharge_type'] ?? '') ?: null,
                'discharge_date'             => $this->parseDateTime($this->getValue($row, ['discharge_date_and_time', 'discharge_date_time', 'discharge_date'], null)),
                'actual_los'                 => $this->parseNumeric($this->getValue($row, ['actual_los_in_days', 'actual_los'], null)),
                'created_at'                 => now(),
                'updated_at'                 => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                IpAdmission::insert($chunk);
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

    private function parseDateTime($value): ?string
    {
        if (!$value || trim((string) $value) === '') {
            return null;
        }

        try {
            return Carbon::createFromFormat('d/m/Y, h:i a', trim((string) $value))->format('Y-m-d H:i:s');
        } catch (\Exception) {
            try {
                return Carbon::parse($value)->format('Y-m-d H:i:s');
            } catch (\Exception) {
                return null;
            }
        }
    }

    private function parseNumeric($value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $cleaned = str_replace(',', '', trim((string) $value));

        return is_numeric($cleaned) ? (float) $cleaned : null;
    }
}
