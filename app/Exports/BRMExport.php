<?php

namespace App\Exports;

use App\Services\BrmService;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class BRMExport implements WithMultipleSheets
{
    public function __construct(
        private string $branch,
        private string $from,
        private string $to
    ) {}

    public function sheets(): array
    {
        $data = app(BrmService::class)->buildBrmData($this->branch, $this->from, $this->to);

        return [
            new BRMSheetERIP(
                $data['erip'], $data['specialities'],
                $data['erCols'], $data['ipCols'],
                $data['erCounts'], $data['ipCounts'],
                $this->from, $this->to
            ),
            new BRMSheetOPServices(
                $data['opServices'], $data['specialities'],
                $data['opCols'], $this->from, $this->to
            ),
            new BRMSheetOPConsultations(
                $data['opConsult'], $data['specialities'],
                $this->from, $this->to
            ),
        ];
    }
}
