<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class MISExport implements FromArray, WithHeadings, WithStyles, WithColumnWidths, WithTitle, ShouldAutoSize
{
    private array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Helper to convert value to Lakhs with 2 decimals and thousand separators (PDF format)
     */
    private function lakhs($value): string
    {
        return number_format(($value ?? 0) / 100000, 2);
    }

    /**
     * Helper to format percentage value
     */
    private function percentage($value): string
    {
        return number_format($value ?? 0, 0) . '%';
    }

    /**
     * Helper to format plain number with 2 decimals
     */
    private function number($value): string
    {
        return number_format($value ?? 0, 2);
    }

    /**
     * Helper to format currency value with rupee symbol and 2 decimals
     */
    private function currency($value): string
    {
        return '₹ ' . number_format($value ?? 0, 2);
    }

    public function headings(): array
    {
        $date = $this->data['date'] ?? '';
        return [
            ["MIS - DATE {$date}", "", "", "", "", "", "", "", "", "", ""],
            ["REVENUE", "FTD", "", "", "", "", "MTD", "", "", "", ""],
            ["", "OP", "IP", "ER", "PH", "Total", "OP", "IP", "ER", "PH", "Total"]
        ];
    }

    public function array(): array
    {
        $sales  = $this->data['sales'] ?? [];
        $col    = $this->data['collection'] ?? [];
        $disc   = $this->data['discount'] ?? [];
        $ref    = $this->data['refund'] ?? [];
        $vol    = $this->data['volume'] ?? [];
        $mri    = $this->data['mri'] ?? [];

        return [
            [
                "Sales",
                $this->lakhs($sales['ftd']['op'] ?? 0),
                $this->lakhs($sales['ftd']['ip'] ?? 0),
                $this->lakhs($sales['ftd']['er'] ?? 0),
                $this->lakhs($sales['ftd']['ph'] ?? 0),
                $this->lakhs(array_sum([
                    $sales['ftd']['op'] ?? 0,
                    $sales['ftd']['ip'] ?? 0,
                    $sales['ftd']['er'] ?? 0,
                    $sales['ftd']['ph'] ?? 0,
                ])),
                $this->lakhs($sales['mtd']['op'] ?? 0),
                $this->lakhs($sales['mtd']['ip'] ?? 0),
                $this->lakhs($sales['mtd']['er'] ?? 0),
                $this->lakhs($sales['mtd']['ph'] ?? 0),
                $this->lakhs(array_sum([
                    $sales['mtd']['op'] ?? 0,
                    $sales['mtd']['ip'] ?? 0,
                    $sales['mtd']['er'] ?? 0,
                    $sales['mtd']['ph'] ?? 0,
                ])),
            ],
            [
                "Collection",
                $this->lakhs($col['ftd']['op'] ?? 0),
                $this->lakhs($col['ftd']['ip'] ?? 0),
                $this->lakhs($col['ftd']['er'] ?? 0),
                $this->lakhs($col['ftd']['ph'] ?? 0),
                $this->lakhs(array_sum($col['ftd'] ?? [])),
                $this->lakhs($col['mtd']['op'] ?? 0),
                $this->lakhs($col['mtd']['ip'] ?? 0),
                $this->lakhs($col['mtd']['er'] ?? 0),
                $this->lakhs($col['mtd']['ph'] ?? 0),
                $this->lakhs(array_sum($col['mtd'] ?? [])),
            ],
            [
                "Discount 99%",
                $this->lakhs($disc['ftd']['partial']['op'] ?? 0),
                $this->lakhs($disc['ftd']['partial']['ip'] ?? 0),
                $this->lakhs($disc['ftd']['partial']['er'] ?? 0),
                $this->lakhs($disc['ftd']['partial']['ph'] ?? 0),
                $this->lakhs(array_sum($disc['ftd']['partial'] ?? [])),
                $this->lakhs($disc['mtd']['partial']['op'] ?? 0),
                $this->lakhs($disc['mtd']['partial']['ip'] ?? 0),
                $this->lakhs($disc['mtd']['partial']['er'] ?? 0),
                $this->lakhs($disc['mtd']['partial']['ph'] ?? 0),
                $this->lakhs(array_sum($disc['mtd']['partial'] ?? [])),
            ],
            [
                "Discount 100%",
                $this->lakhs($disc['ftd']['full']['op'] ?? 0),
                $this->lakhs($disc['ftd']['full']['ip'] ?? 0),
                $this->lakhs($disc['ftd']['full']['er'] ?? 0),
                $this->lakhs($disc['ftd']['full']['ph'] ?? 0),
                $this->lakhs(array_sum($disc['ftd']['full'] ?? [])),
                $this->lakhs($disc['mtd']['full']['op'] ?? 0),
                $this->lakhs($disc['mtd']['full']['ip'] ?? 0),
                $this->lakhs($disc['mtd']['full']['er'] ?? 0),
                $this->lakhs($disc['mtd']['full']['ph'] ?? 0),
                $this->lakhs(array_sum($disc['mtd']['full'] ?? [])),
            ],
            [
                "Refund",
                $this->lakhs($ref['ftd']['op'] ?? 0),
                $this->lakhs($ref['ftd']['ip'] ?? 0),
                $this->lakhs($ref['ftd']['er'] ?? 0),
                $this->lakhs($ref['ftd']['ph'] ?? 0),
                $this->lakhs(array_sum($ref['ftd'] ?? [])),
                $this->lakhs($ref['mtd']['op'] ?? 0),
                $this->lakhs($ref['mtd']['ip'] ?? 0),
                $this->lakhs($ref['mtd']['er'] ?? 0),
                $this->lakhs($ref['mtd']['ph'] ?? 0),
                $this->lakhs(array_sum($ref['mtd'] ?? [])),
            ],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "FTD", "MTD", "", "", "", "", "", "", "", ""],
            ["Volume Indicators", "", "", "", "", "", "", "", "", "", ""],
            ["Occupancy", $this->number($vol['ftd']['occupancy'] ?? 0), $this->number($vol['mtd']['occupancy'] ?? 0), "", "", "", "", "", "", "", ""],
            ["Occupancy %", $this->percentage($vol['ftd']['occupancy_pct'] ?? 0), $this->percentage($vol['mtd']['occupancy_pct'] ?? 0), "", "", "", "", "", "", "", ""],
            ["Admission", $this->number($vol['ftd']['admission'] ?? 0), $this->number($vol['mtd']['admission'] ?? 0), "", "", "", "", "", "", "", ""],
            ["Discharge", $this->number($vol['ftd']['discharge'] ?? 0), $this->number($vol['mtd']['discharge'] ?? 0), "", "", "", "", "", "", "", ""],
            ["Total OP", $this->number($vol['ftd']['total_op'] ?? 0), $this->number($vol['mtd']['total_op'] ?? 0), "", "", "", "", "", "", "", ""],
            ["MRI OP (count)", $this->number($mri['ftd']['op']['count'] ?? 0), $this->number($mri['mtd']['op']['count'] ?? 0), "", "", "", "", "", "", "", ""],
            ["MRI IP (count)", $this->number($mri['ftd']['ip']['count'] ?? 0), $this->number($mri['mtd']['ip']['count'] ?? 0), "", "", "", "", "", "", "", ""],
            ["Revenue", "", "", "", "", "", "", "", "", "", ""],
            ["MRI OP (₹)", $this->currency($mri['ftd']['op']['revenue'] ?? 0), $this->currency($mri['mtd']['op']['revenue'] ?? 0), "", "", "", "", "", "", "", ""],
            ["MRI IP (₹)", $this->currency($mri['ftd']['ip']['revenue'] ?? 0), $this->currency($mri['mtd']['ip']['revenue'] ?? 0), "", "", "", "", "", "", "", ""],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 12,
            'C' => 12,
            'D' => 12,
            'E' => 12,
            'F' => 12,
            'G' => 12,
            'H' => 12,
            'I' => 12,
            'J' => 12,
            'K' => 12,
        ];
    }

    public function title(): string
    {
        $branch = ucfirst($this->data['branch'] ?? '');
        $date = $this->data['date'] ?? '';
        return substr("MIS {$branch} {$date}", 0, 31);
    }

    public function styles(Worksheet $sheet): array
    {
        // Row 1: Merged header
        $sheet->mergeCells('A1:K1');
        // Row 2: Column groups
        $sheet->mergeCells('B2:F2');
        $sheet->mergeCells('G2:K2');
        // Volume Indicators and Revenue
        $sheet->mergeCells('A11:C11');
        $sheet->mergeCells('A19:C19');

        // Alternating row background: light gray
        $lightGray = ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F2F2F2']];
        foreach ([5, 7, 13, 15, 17, 21] as $row) {
            $sheet->getStyle("A{$row}:K{$row}")->getFill()->applyFromArray($lightGray);
        }

        // Set text alignment for formatted values
        $sheet->getStyle('B4:K8')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('B12:C18')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('B20:C21')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        return [
            1 => [
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'DDEBF7'], // Light blue
                ],
            ],
            2 => [
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'D9D9D9'], // Gray
                ],
            ],
            3 => [
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'D9D9D9'], // Gray
                ],
            ],
            'F' => ['font' => ['bold' => true]], // Grand Total FTD
            'K' => ['font' => ['bold' => true]], // Grand Total MTD
            'A' => ['font' => ['bold' => true]], // Row Labels
            10 => ['font' => ['bold' => true]], // Sub-header FTD MTD
            11 => [
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'D9D9D9'],
                ],
            ],
            19 => [
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'D9D9D9'],
                ],
            ],
        ];
    }
}
