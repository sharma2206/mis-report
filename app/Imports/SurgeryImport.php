<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\Surgery;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class SurgeryImport implements ToCollection, WithHeadingRow, WithChunkReading
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
            $surgeryName = trim($row['surgery_name'] ?? '');

            if (empty($admissionNo) && empty($surgeryName)) {
                continue;
            }

            $insert[] = [
                'branch'               => $this->branch->value,
                'surgery_date'         => $this->parseDateOnly($this->getValue($row, ['surgery_start_date_and_time', 'surgery_scheduled_date_time', 'surgery_booking_date_and_time'], null)) ?? $this->date,
                'admission_no'         => $admissionNo ?: null,
                'uhid'                 => trim($row['uhid'] ?? '') ?: null,
                'patient_name'         => trim($row['patient_name'] ?? '') ?: null,
                'age'                  => trim($row['age'] ?? '') ?: null,
                'gender'               => trim($row['gender'] ?? '') ?: null,
                'patient_type'         => $this->normalizePatientType($row['patient_type'] ?? null),
                'surgery_name'         => $surgeryName ?: null,
                'surgery_code'         => trim($row['surgery_code'] ?? '') ?: null,
                'surgery_category'     => trim($row['surgery_category'] ?? '') ?: null,
                'surgery_type'         => trim($row['surgery_type'] ?? '') ?: null,
                'surgery_department'   => trim($row['surgery_department'] ?? '') ?: null,
                'surgery_sub_department' => trim($this->getValue($row, ['surgery_sub_department', 'surgery_subdepartment'], '')) ?: null,
                'ot_name'              => trim($this->getValue($row, ['ot_cathlab_name', 'otcathlab_name', 'ot_name'], '')) ?: null,
                'ot_surgery_type'      => trim($this->getValue($row, ['ot_cathlab_surgery_type', 'otcathlabsurgery_type'], '')) ?: null,
                'performing_surgeon'   => trim($row['performing_surgeon'] ?? '') ?: null,
                'component_doctor'     => trim($row['component_doctor'] ?? '') ?: null,
                'surgeon_speciality'   => trim($row['performing_surgeon_speciality'] ?? '') ?: null,
                'surgeon_department'   => trim($row['performing_surgeon_department'] ?? '') ?: null,
                'anaesthesia_type'     => trim($row['anaesthesia_type'] ?? '') ?: null,
                'payer_type'           => strtolower(trim($row['payer_type'] ?? '')) ?: null,
                'payer_name'           => trim($row['payer_name'] ?? '') ?: null,
                'payer_group'          => trim($row['payer_group'] ?? '') ?: null,
                'billing_category'     => trim($row['billing_category'] ?? '') ?: null,
                'status'               => trim($row['status'] ?? '') ?: null,
                'diagnosis_name'       => trim($row['diagnosis_name'] ?? '') ?: null,
                'implant_required'     => strtolower(trim($row['implant_required'] ?? '')) === 'yes',
                'surgery_contamination'=> trim($row['surgery_contamination'] ?? '') ?: null,
                'pac_clearance'        => strtolower(trim($row['pac_clearance'] ?? '')) === 'yes',
                'surgery_start'        => $this->parseDateTime($this->getValue($row, ['surgery_start_date_and_time', 'surgery_start_date_time', 'surgery_startdate_and_time'], null)),
                'surgery_end'          => $this->parseDateTime($this->getValue($row, ['surgery_end_date_time', 'surgery_enddatetime', 'surgery_end_datetime'], null)),
                'ot_checkin'           => $this->parseDateTime($this->getValue($row, ['ot_checkin_date_and_time', 'ot_checkindate_and_time'], null)),
                'ot_checkout'          => $this->parseDateTime($this->getValue($row, ['ot_checkout_date_and_time', 'ot_checkoutdate_and_time'], null)),
                'surgery_tat'          => trim($this->getValue($row, ['surgery_startend_tat', 'surgery_start_end_tat'], '')) ?: null,
                'ot_tat'               => trim($this->getValue($row, ['ot_check_inout_tat', 'ot_checkinout_tat'], '')) ?: null,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                Surgery::insert($chunk);
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
