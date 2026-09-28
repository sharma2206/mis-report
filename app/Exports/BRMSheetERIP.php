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

class BRMSheetERIP implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    public function __construct(
        private array  $data,         // [doc]['er'|'ip'][svc] = amt
        private array  $specialities, // [doc] = speciality
        private array  $erCols,
        private array  $ipCols,
        private array  $erCounts,     // [doctor_name] = count
        private array  $ipCounts,     // [treating_doctor] = count
        private string $from,
        private string $to
    ) {}

    public function array(): array
    {
        $rows = [];

        // ── Row 1: group-level headers ──────────────────────────────────────
        $h1 = ['DOCTOR', 'SPECIALITY', 'ER COUNT', 'IP COUNT'];
        if ($this->erCols) {
            $h1[] = 'ER';
            foreach (range(1, count($this->erCols) - 1) as $_) $h1[] = '';
        }
        $h1[] = 'ER Total';
        if ($this->ipCols) {
            $h1[] = 'IP';
            foreach (range(1, count($this->ipCols) - 1) as $_) $h1[] = '';
        }
        $h1[] = 'IP Total';
        $h1[] = 'Grand Total';
        $rows[] = $h1;

        // ── Row 2: service-type sub-headers ─────────────────────────────────
        $h2 = ['', '', '', ''];
        foreach ($this->erCols as $c) $h2[] = $c;
        $h2[] = '';
        foreach ($this->ipCols as $c) $h2[] = $c;
        $h2[] = '';
        $h2[] = '';
        $rows[] = $h2;

        // ── Data rows ────────────────────────────────────────────────────────
        $allDocs = array_unique(array_merge(
            array_keys($this->data),
            array_keys($this->erCounts),
            array_keys($this->ipCounts)
        ));
        sort($allDocs);

        foreach ($allDocs as $doc) {
            $erCount = $this->erCounts[$doc] ?? null;
            $ipCount = $this->ipCounts[$doc] ?? null;
            if (!$erCount && !$ipCount && empty($this->data[$doc])) {
                continue;
            }

            $row = [$doc, $this->specialities[$doc] ?? '', $erCount ?: '', $ipCount ?: ''];
            $erTotal = 0;
            foreach ($this->erCols as $svc) {
                $amt = $this->data[$doc]['er'][$svc] ?? null;
                $row[] = $amt !== null ? round($amt, 2) : '';
                $erTotal += (float)($amt ?? 0);
            }
            $row[] = $erTotal ?: '';
            $ipTotal = 0;
            foreach ($this->ipCols as $svc) {
                $amt = $this->data[$doc]['ip'][$svc] ?? null;
                $row[] = $amt !== null ? round($amt, 2) : '';
                $ipTotal += (float)($amt ?? 0);
            }
            $row[] = $ipTotal ?: '';
            $row[] = ($erTotal + $ipTotal) ?: '';
            $rows[] = $row;
        }

        // ── Grand Total row ──────────────────────────────────────────────────
        $tot = ['Grand Total', '', array_sum($this->erCounts) ?: '', array_sum($this->ipCounts) ?: ''];
        $erGT = 0;
        foreach ($this->erCols as $svc) {
            $s = array_sum(array_column(array_map(fn($d) => ['v' => $d['er'][$svc] ?? 0], $this->data), 'v'));
            $tot[] = round($s, 2) ?: '';
            $erGT += $s;
        }
        $tot[] = round($erGT, 2) ?: '';
        $ipGT = 0;
        foreach ($this->ipCols as $svc) {
            $s = array_sum(array_column(array_map(fn($d) => ['v' => $d['ip'][$svc] ?? 0], $this->data), 'v'));
            $tot[] = round($s, 2) ?: '';
            $ipGT += $s;
        }
        $tot[] = round($ipGT, 2) ?: '';
        $tot[] = round($erGT + $ipGT, 2);
        $rows[] = $tot;

        return $rows;
    }

    public function title(): string
    {
        return 'ER IP';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet   = $event->sheet->getDelegate();
                $erLen   = count($this->erCols);
                $ipLen   = count($this->ipCols);
                $lastRow = $sheet->getHighestRow();
                $cl      = fn($n) => Coordinate::stringFromColumnIndex($n);

                // Column index positions (1-based)
                $erStartIdx   = 5;
                $erEndIdx     = 4 + max($erLen, 1);
                $erTotalIdx   = 5 + $erLen;
                $ipStartIdx   = 6 + $erLen;
                $ipEndIdx     = 5 + $erLen + max($ipLen, 1);
                $ipTotalIdx   = 6 + $erLen + $ipLen;
                $grandTotIdx  = 7 + $erLen + $ipLen;
                $lastColLetter = $cl($grandTotIdx);

                // Merge ER group header in row 1
                if ($erLen > 1) {
                    $sheet->mergeCells("{$cl($erStartIdx)}1:{$cl($erEndIdx)}1");
                }
                // Merge IP group header in row 1
                if ($ipLen > 1) {
                    $sheet->mergeCells("{$cl($ipStartIdx)}1:{$cl($ipEndIdx)}1");
                }

                // Header row 1 style
                $sheet->getStyle("A1:{$lastColLetter}1")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2F5496']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Header row 2 style
                $sheet->getStyle("A2:{$lastColLetter}2")->applyFromArray([
                    'font'      => ['bold' => true],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
                ]);

                // Grand Total row style
                $sheet->getStyle("A{$lastRow}:{$lastColLetter}{$lastRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FCE4D6']],
                ]);

                // Bold the Total columns
                foreach ([$erTotalIdx, $ipTotalIdx, $grandTotIdx] as $idx) {
                    $sheet->getStyle("{$cl($idx)}1:{$cl($idx)}{$lastRow}")->getFont()->setBold(true);
                }

                // Alternating row color for data rows
                for ($r = 3; $r < $lastRow; $r++) {
                    if ($r % 2 === 0) {
                        $sheet->getStyle("A{$r}:{$lastColLetter}{$r}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']],
                        ]);
                    }
                }

                // Row heights
                $sheet->getRowDimension(1)->setRowHeight(22);
                $sheet->getRowDimension(2)->setRowHeight(40);

                // Freeze header rows + first 2 columns
                $sheet->freezePane('E3');
            },
        ];
    }
}
