<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class BRMSheetOPServices implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    public function __construct(
        private array  $data,         // [doc][svc] = amt
        private array  $specialities,
        private array  $opCols,
        private string $from,
        private string $to
    ) {}

    public function array(): array
    {
        $rows = [];

        // ── Row 1: group header ──────────────────────────────────────────────
        $h1 = ['DOCTOR', 'SPECIALITY'];
        if ($this->opCols) {
            $h1[] = 'OP';
            foreach (range(1, count($this->opCols) - 1) as $_) $h1[] = '';
        }
        $h1[] = 'OP Total';
        $h1[] = 'Grand Total';
        $rows[] = $h1;

        // ── Row 2: service-type sub-headers ─────────────────────────────────
        $h2 = ['', ''];
        foreach ($this->opCols as $c) $h2[] = $c;
        $h2[] = '';
        $h2[] = '';
        $rows[] = $h2;

        // ── Data rows ────────────────────────────────────────────────────────
        $allDocs = array_keys($this->data);
        sort($allDocs);

        foreach ($allDocs as $doc) {
            $row   = [$doc, $this->specialities[$doc] ?? ''];
            $total = 0;
            foreach ($this->opCols as $svc) {
                $amt   = $this->data[$doc][$svc] ?? null;
                $row[] = $amt !== null ? round($amt, 2) : '';
                $total += (float)($amt ?? 0);
            }
            $row[] = $total ?: '';
            $row[] = $total ?: '';
            $rows[] = $row;
        }

        // ── Grand Total row ──────────────────────────────────────────────────
        $tot = ['Grand Total', ''];
        $gt  = 0;
        foreach ($this->opCols as $svc) {
            $s = 0;
            foreach ($this->data as $d) $s += (float)($d[$svc] ?? 0);
            $tot[] = round($s, 2) ?: '';
            $gt   += $s;
        }
        $tot[] = round($gt, 2) ?: '';
        $tot[] = round($gt, 2);
        $rows[] = $tot;

        return $rows;
    }

    public function title(): string
    {
        return 'OP SERVICES';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet         = $event->sheet->getDelegate();
                $opLen         = count($this->opCols);
                $lastRow       = $sheet->getHighestRow();
                $cl            = fn($n) => Coordinate::stringFromColumnIndex($n);
                $opStartIdx    = 3;
                $opEndIdx      = 2 + max($opLen, 1);
                $opTotalIdx    = 3 + $opLen;
                $grandTotIdx   = 4 + $opLen;
                $lastColLetter = $cl($grandTotIdx);

                // Merge OP group header
                if ($opLen > 1) {
                    $sheet->mergeCells("{$cl($opStartIdx)}1:{$cl($opEndIdx)}1");
                }

                // Header row 1
                $sheet->getStyle("A1:{$lastColLetter}1")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '375623']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Header row 2
                $sheet->getStyle("A2:{$lastColLetter}2")->applyFromArray([
                    'font'      => ['bold' => true],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'C6EFCE']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
                ]);

                // Grand Total row
                $sheet->getStyle("A{$lastRow}:{$lastColLetter}{$lastRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FCE4D6']],
                ]);

                // Bold Total columns
                foreach ([$opTotalIdx, $grandTotIdx] as $idx) {
                    $sheet->getStyle("{$cl($idx)}1:{$cl($idx)}{$lastRow}")->getFont()->setBold(true);
                }

                // Alternating rows
                for ($r = 3; $r < $lastRow; $r++) {
                    if ($r % 2 === 0) {
                        $sheet->getStyle("A{$r}:{$lastColLetter}{$r}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']],
                        ]);
                    }
                }

                $sheet->getRowDimension(1)->setRowHeight(22);
                $sheet->getRowDimension(2)->setRowHeight(40);
                $sheet->freezePane('C3');
            },
        ];
    }
}
