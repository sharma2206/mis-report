<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class BRMSheetOPConsultations implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    public function __construct(
        private array  $data,         // [doc] = ['count'=>n, 'amount'=>x]
        private array  $specialities,
        private string $from,
        private string $to
    ) {}

    public function array(): array
    {
        $rows = [];

        // ── Row 1: header ────────────────────────────────────────────────────
        $rows[] = ['DOCTOR', 'SPECIALITY', 'OP Consultation', ''];

        // ── Row 2: sub-headers ───────────────────────────────────────────────
        $rows[] = ['', '', 'OP COUNT', 'NET AMOUNT'];

        // ── Data rows ────────────────────────────────────────────────────────
        $allDocs = array_keys($this->data);
        sort($allDocs);

        foreach ($allDocs as $doc) {
            $rows[] = [
                $doc,
                $this->specialities[$doc] ?? '',
                $this->data[$doc]['count']  ?? 0,
                round($this->data[$doc]['amount'] ?? 0, 2),
            ];
        }

        // ── Grand Total row ──────────────────────────────────────────────────
        $totalCount  = array_sum(array_column($this->data, 'count'));
        $totalAmount = array_sum(array_column($this->data, 'amount'));
        $rows[] = ['Grand Total', '', $totalCount, round($totalAmount, 2)];

        return $rows;
    }

    public function title(): string
    {
        return 'OP CONSULTATIONS';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet   = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();

                // Merge "OP Consultation" header across C and D in row 1
                $sheet->mergeCells('C1:D1');

                // Header row 1
                $sheet->getStyle('A1:D1')->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '7030A0']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Header row 2
                $sheet->getStyle('A2:D2')->applyFromArray([
                    'font'      => ['bold' => true],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2EFDA']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Amount column: right-align numbers
                $sheet->getStyle("D3:D{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

                // Grand Total row
                $sheet->getStyle("A{$lastRow}:D{$lastRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FCE4D6']],
                ]);

                // Alternating rows
                for ($r = 3; $r < $lastRow; $r++) {
                    if ($r % 2 === 0) {
                        $sheet->getStyle("A{$r}:D{$r}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']],
                        ]);
                    }
                }

                $sheet->getRowDimension(1)->setRowHeight(22);
                $sheet->getRowDimension(2)->setRowHeight(22);
                $sheet->freezePane('A3');
            },
        ];
    }
}
