<?php

namespace App\Imports;

use App\Enums\Branch;
use App\Models\CashierCollection;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class CashierCollectionImport implements ToCollection, WithHeadingRow, WithChunkReading
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
            $paidAmount = (float) ($row['paid_amount'] ?? 0);
            $receiptNo  = trim($this->getValue($row, ['refund_no_receipt_no', 'receipt_no', 'refundnoreceipt_no', 'receiptno'], ''));

            if ($paidAmount == 0 && empty($receiptNo)) {
                continue;
            }

            // Build individual payment mode string from breakdown columns
            $paymentMode = $this->resolvePaymentMode($row);

            $insert[] = [
                'branch'               => $this->branch->value,
                'collection_date'      => $this->parseDateOnly($this->getValue($row, ['receiptrefund_date_time', 'receipt_refund_date_time', 'receipt_date_time'], null)) ?? $this->date,
                'uhid'                 => trim($row['uhid'] ?? '') ?: null,
                'patient_name'         => trim($row['patient_name'] ?? '') ?: null,
                'visit_id'             => trim($row['visit_id'] ?? '') ?: null,
                'receipt_no'           => $receiptNo ?: null,
                'patient_type'         => $this->normalizePatientType($row['patient_type'] ?? null),
                'user_department'      => trim($row['user_department'] ?? '') ?: null,
                'paid_amount'          => $paidAmount,
                'transaction_type'     => trim($row['transaction_type'] ?? '') ?: null,
                'transaction_category' => trim($row['transaction_category'] ?? '') ?: null,
                'payment_mode'         => $paymentMode,
                'payer_type'           => strtolower(trim($this->getValue($row, ['payer_type'], ''))) ?: null,
                'payer_name'           => trim($this->getValue($row, ['payer', 'payer_name'], '')) ?: null,
                'created_at'           => now(),
                'updated_at'           => now(),
            ];
        }

        if (!empty($insert)) {
            foreach (array_chunk($insert, 500) as $chunk) {
                CashierCollection::insert($chunk);
            }
            $this->rowCount += count($insert);
        }
    }

    public function chunkSize(): int
    {
        return 1000;
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

    private function resolvePaymentMode($row): ?string
    {
        // Try explicit payment_mode column first
        $explicit = trim($this->getValue($row, ['payment_mode', 'payment_method'], ''));
        if ($explicit) {
            return $explicit;
        }

        // Build from individual payment breakdown columns
        $modes = [];
        $modeColumns = ['cash', 'pos', 'upi', 'cheque', 'dd', 'neft', 'rtgs', 'imps',
                        'credit_card', 'debit_card', 'google_pay', 'phone_pay', 'paytm',
                        'tpa', 'insurance', 'corporate', 'razorpay', 'pine_lab'];

        foreach ($modeColumns as $col) {
            $val = (float) ($row[$col] ?? 0);
            if ($val > 0) {
                $modes[] = strtoupper($col);
            }
        }

        return $modes ? implode(', ', $modes) : null;
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
                $key = strtolower(str_replace([' ', '-', '_', '/', '.'], '', $rk));
                $normalized[$key] = $rv;
            }
        }
        foreach ($keys as $k) {
            $nk = strtolower(str_replace([' ', '-', '_', '/', '.'], '', $k));
            if (array_key_exists($nk, $normalized) && trim((string)$normalized[$nk]) !== '') {
                return $normalized[$nk];
            }
        }

        return $default;
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
