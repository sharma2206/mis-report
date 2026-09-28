<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class MisCsvExport implements FromArray, WithHeadings, WithTitle
{
    public function __construct(private array $data) {}

    public function title(): string { return 'MIS Report'; }

    public function headings(): array
    {
        return ['Category', 'Period', 'OP', 'IP', 'ER', 'PH', 'Total'];
    }

    public function array(): array
    {
        $rows  = [];
        $date  = $this->data['date'] ?? '';
        $year  = substr($date, 0, 7);
        $sections = [
            'Sales'        => $this->data['sales']      ?? [],
            'Collection'   => $this->data['collection'] ?? [],
            'Discount 99%' => array_map(fn($p) => $p['partial'] ?? [], $this->data['discount'] ?? []),
            'Discount 100%'=> array_map(fn($p) => $p['full']    ?? [], $this->data['discount'] ?? []),
            'Refund'       => $this->data['refund']     ?? [],
        ];

        foreach ($sections as $label => $d) {
            foreach (['ftd' => $date, 'mtd' => $year] as $p => $pLabel) {
                $r = $d[$p] ?? [];
                $rows[] = [
                    $label,
                    strtoupper($p),
                    round(($r['op'] ?? 0) / 100000, 4),
                    round(($r['ip'] ?? 0) / 100000, 4),
                    round(($r['er'] ?? 0) / 100000, 4),
                    round(($r['ph'] ?? 0) / 100000, 4),
                    round(array_sum($r) / 100000, 4),
                ];
            }
        }

        // Volume
        $vol = $this->data['volume'] ?? [];
        foreach (['ftd', 'mtd'] as $p) {
            $v = $vol[$p] ?? [];
            $rows[] = ['Occupancy',     strtoupper($p), $v['occupancy']     ?? 0, '', '', '', ''];
            $rows[] = ['Occupancy %',   strtoupper($p), ($v['occupancy_pct'] ?? 0).'%', '', '', '', ''];
            $rows[] = ['Admissions',    strtoupper($p), $v['admission']     ?? 0, '', '', '', ''];
            $rows[] = ['Discharges',    strtoupper($p), $v['discharge']     ?? 0, '', '', '', ''];
            $rows[] = ['Total OP',      strtoupper($p), $v['total_op']      ?? 0, '', '', '', ''];
        }

        return $rows;
    }
}
