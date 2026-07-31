<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\BillItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class BillItemImport implements ToCollection, WithHeadingRow, WithChunkReading
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
            $uhid   = trim($this->getValue($row, ['uhid'], ''));
            $billNo = trim($this->getValue($row, ['bill_no', 'billno', 'bill_number'], ''));

            if (empty($uhid) && empty($billNo)) {
                continue;
            }

            $amount    = (float) $this->getValue($row, ['amount', 'amt', 'total_amount']);
            $discount = (float) $this->getValue($row, [
                'discount_amount',
                'discount amount',
                'discount amt',
                'discount_amt',
                'discount',
                'disc'
            ], 0);

            $netAmountRaw = $this->getValue($row, ['net_amount', 'net amount', 'netamount', 'net-amount'], null);
            if ($netAmountRaw !== null && trim((string) $netAmountRaw) !== '') {
                $netAmount = (float) $netAmountRaw;
            } elseif ($discount > 0) {
                $netAmount = $amount - $discount;
            } else {
                $netAmount = $amount;
            }

            // Derive discount_amount if not explicitly provided
            if ($discount <= 0 && $netAmount < $amount) {
                $discount = $amount - $netAmount;
            }

            $insert[] = [
                'branch'                   => $this->branch->value,
                'bill_date'                => $this->parseDateOnly($this->getValue($row, ['bill_refund_creation_date_time'], null)) ?? $this->date,
                'bill_no'                  => $billNo ?: null,
                'uhid'                     => $uhid ?: null,
                'patient_id'               => $uhid ?: trim($this->getValue($row, ['patient_id'], '')),
                'patient_name'             => trim($this->getValue($row, ['patient_name'], '')) ?: null,
                'age'                      => trim($this->getValue($row, ['age', 'patient_age'], '')) ?: null,
                'gender'                   => trim($this->getValue($row, ['gender', 'patient_gender'], '')) ?: null,
                'ward'                     => trim($this->getValue($row, ['ward'], '')) ?: null,
                'bed'                      => trim($this->getValue($row, ['bed'], '')) ?: null,
                'visit_id'                 => trim($this->getValue($row, ['visit_id', 'visit_id_admissionid', 'visitid', 'visit_idadmissionid'], '')) ?: null,
                'patient_type'             => $this->normalizePatientType($row['patient_type'] ?? null),
                'payer_type'               => strtolower(trim($this->getValue($row, ['payer_type'], ''))) ?: null,
                'payer_name'               => trim($this->getValue($row, ['payer_name', 'payer'], '')) ?: null,
                'payer_group'              => trim($this->getValue($row, ['payer_group'], '')) ?: null,
                'insurance_company'        => trim($this->getValue($row, ['insurance_company'], '')) ?: null,
                'corporate_name'           => trim($this->getValue($row, ['corporate_name'], '')) ?: null,
                'service_type'             => trim($row['service_type'] ?? ''),
                'sub_department'           => trim($row['sub_department'] ?? '') ?: null,
                'service_item_code'        => trim($this->getValue($row, ['service_item_code'], '')) ?: null,
                'service_item_name'        => trim($this->getValue($row, ['service_item_name'], '')) ?: null,
                'treating_doctor'          => trim($this->getValue($row, ['treating_doctor_team', 'treating_doctorteam', 'treating_doctor'], '')) ?: null,
                'treating_doctor_speciality' => trim($this->getValue($row, ['treating_doctor_speciality'], '')) ?: null,
                'treating_department'      => trim($this->getValue($row, ['treating_department', 'department'], '')) ?: null,
                'treating_sub_department'  => trim($this->getValue($row, ['treating_sub_department'], '')) ?: null,
                'billing_category'         => trim($this->getValue($row, ['billing_category'], '')) ?: null,
                'amount'                   => $amount,
                'discount_amount'          => round($discount, 2),
                'net_amount'               => $netAmount,
                'quantity'                 => (int) ($row['quantity'] ?? 1),
                'payment_mode'             => trim($this->getValue($row, ['settlement_payment_modes', 'payment_mode', 'payment_method'], '')) ?: null,
                'status'                   => $this->normalizeStatus($row['status'] ?? null),
                'created_at'               => now(),
                'updated_at'               => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                BillItem::insert($chunk);
            }
            $this->rowCount += count($insert);
        }
    }

    public function chunkSize(): int
    {
        return 1000;
    }

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

        $normalized = [];
        if (is_array($row)) {
            foreach ($row as $rk => $rv) {
                $key = strtolower(str_replace([' ', '-', '_', '/'], '', $rk));
                $normalized[$key] = $rv;
            }
        }
        foreach ($keys as $k) {
            $nk = strtolower(str_replace([' ', '-', '_', '/'], '', $k));
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

    private function normalizeStatus(?string $status): string
    {
        $s = strtolower(trim($status ?? ''));
        return match (true) {
            in_array($s, ['refund', 'refunded'], true)                        => 'Refund',
            in_array($s, ['cancelled', 'canceled', 'cancel'], true)           => 'Cancelled',
            in_array($s, ['active', 'sale', 'billed', 'approved', ''], true)  => 'Sale',
            default                                                            => 'Sale',
        };
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
