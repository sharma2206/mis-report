<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
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
        // Single grouped query for all patient types across the date range
        $items = DB::table('bill_items')
            ->where('branch', $this->branch)
            ->whereBetween('bill_date', [$this->from, $this->to])
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '')
            ->whereNotIn('status', ['Cancelled', 'Refunded'])
            ->selectRaw('patient_type, treating_doctor, treating_doctor_speciality, service_type, SUM(net_amount) AS total_amt, COUNT(*) AS row_count')
            ->groupBy('patient_type', 'treating_doctor', 'treating_doctor_speciality', 'service_type')
            ->get();

        // ER patient counts per doctor from er_admissions
        $erCounts = DB::table('er_admissions')
            ->where('branch', $this->branch)
            ->whereBetween('admission_date', [$this->from, $this->to])
            ->whereNotNull('doctor_name')
            ->where('doctor_name', '!=', '')
            ->selectRaw('doctor_name, COUNT(*) as cnt')
            ->groupBy('doctor_name')
            ->pluck('cnt', 'doctor_name')
            ->toArray();

        // IP patient counts per doctor from ip_admissions
        $ipCounts = DB::table('ip_admissions')
            ->where('branch', $this->branch)
            ->whereBetween('admission_date', [$this->from, $this->to])
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '')
            ->selectRaw('treating_doctor, COUNT(*) as cnt')
            ->groupBy('treating_doctor')
            ->pluck('cnt', 'treating_doctor')
            ->toArray();

        // Build per-type data structures
        $erip        = [];   // [doc]['er'|'ip'][svc] = amt
        $opServices  = [];   // [doc][svc] = amt
        $opConsult   = [];   // [doc] = ['count'=>n, 'amount'=>x]
        $specialities = [];  // [doc] = speciality string
        $erCols = [];
        $ipCols = [];
        $opCols = [];

        foreach ($items as $item) {
            $doc  = $item->treating_doctor;
            $spec = $item->treating_doctor_speciality ?? '';
            $type = strtoupper($item->patient_type ?? '');
            $svc  = $item->service_type ?? 'Other';
            $amt  = (float) $item->total_amt;
            $cnt  = (int)   $item->row_count;

            if ($spec && !isset($specialities[$doc])) {
                $specialities[$doc] = $spec;
            }

            if ($type === 'ER') {
                $erip[$doc]['er'][$svc] = ($erip[$doc]['er'][$svc] ?? 0) + $amt;
                $erCols[$svc] = true;
            } elseif ($type === 'IP') {
                $erip[$doc]['ip'][$svc] = ($erip[$doc]['ip'][$svc] ?? 0) + $amt;
                $ipCols[$svc] = true;
            } elseif ($type === 'OP') {
                if (stripos($svc, 'consultation') !== false) {
                    $opConsult[$doc]['count']  = ($opConsult[$doc]['count']  ?? 0) + $cnt;
                    $opConsult[$doc]['amount'] = ($opConsult[$doc]['amount'] ?? 0) + $amt;
                } else {
                    $opServices[$doc][$svc] = ($opServices[$doc][$svc] ?? 0) + $amt;
                    $opCols[$svc] = true;
                }
            }
        }

        $erColsArr = array_keys($erCols); sort($erColsArr);
        $ipColsArr = array_keys($ipCols); sort($ipColsArr);
        $opColsArr = array_keys($opCols); sort($opColsArr);

        return [
            new BRMSheetERIP($erip, $specialities, $erColsArr, $ipColsArr, $erCounts, $ipCounts, $this->from, $this->to),
            new BRMSheetOPServices($opServices, $specialities, $opColsArr, $this->from, $this->to),
            new BRMSheetOPConsultations($opConsult, $specialities, $this->from, $this->to),
        ];
    }
}
