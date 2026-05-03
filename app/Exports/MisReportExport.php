<?php

namespace App\Exports;

use App\Models\MisReport;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class MisReportExport implements FromArray, ShouldAutoSize, WithTitle, WithEvents
{
    public function __construct(private MisReport $report) {}

    public function array(): array
    {
        $r = $this->report;
        $p = $r->payload ?? [];

        return [
            ['DAILY MIS REPORT - ' . $r->report_date->format('d-M-Y'), '', '', ''],
            ['', '', '', ''],
            ['SALES', '', '', ''],
            ['OP Sales',       $p['sales']['op']    ?? 0, '', ''],
            ['IP Sales',       $p['sales']['ip']    ?? 0, '', ''],
            ['ER Sales',       $p['sales']['er']    ?? 0, '', ''],
            ['Pharmacy Sales', $p['sales']['ph']    ?? 0, '', ''],
            ['Total Sales',    $p['sales']['total'] ?? 0, '', ''],
            ['', '', '', ''],
            ['COLLECTION', '', '', ''],
            ['OP Collection',  $p['collection']['op']    ?? 0, '', ''],
            ['IP Collection',  $p['collection']['ip']    ?? 0, '', ''],
            ['ER Collection',  $p['collection']['er']    ?? 0, '', ''],
            ['Total Collection', $p['collection']['total'] ?? 0, '', ''],
            ['', '', '', ''],
            ['DISCOUNTS', '', '', ''],
            ['99% Discount',   $p['discount']['d99']  ?? 0, '', ''],
            ['100% Discount',  $p['discount']['d100'] ?? 0, '', ''],
            ['', '', '', ''],
            ['REFUND',         $p['refund'] ?? 0, '', ''],
            ['', '', '', ''],
            ['MRI METRICS', '', '', ''],
            ['MRI OP Count',   $p['mri']['op_count']   ?? 0, '', ''],
            ['MRI IP Count',   $p['mri']['ip_count']   ?? 0, '', ''],
            ['MRI OP Revenue', $p['mri']['op_revenue'] ?? 0, '', ''],
            ['MRI IP Revenue', $p['mri']['ip_revenue'] ?? 0, '', ''],
            ['', '', '', ''],
            ['Total OP Count', $p['total_op'] ?? 0, '', ''],
            ['', '', '', ''],
            ['OPERATIONAL', '', '', ''],
            ['Occupancy',         $p['operational']['occupancy']         ?? 0, '', ''],
            ['Occupancy %',       $p['operational']['occupancy_percent'] ?? 0, '', ''],
            ['Admissions',        $p['operational']['admission']         ?? 0, '', ''],
            ['Discharges',        $p['operational']['discharge']         ?? 0, '', ''],
        ];
    }

    public function title(): string
    {
        return 'MIS Report ' . $this->report->report_date->format('Y-m-d');
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Title styling
                $sheet->mergeCells('A1:D1');
                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E78']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                // Section headers (bold)
                foreach (['A3', 'A10', 'A16', 'A22', 'A30'] as $cell) {
                    $sheet->getStyle($cell)->applyFromArray([
                        'font' => ['bold' => true, 'color' => ['rgb' => '1F4E78']],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9E1F2']],
                    ]);
                }
            },
        ];
    }
}
