<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class BrmService
{
    /**
     * Fetch and transform all bill_items data needed for the BRM Excel export.
     * Returns structured arrays ready for the three BRM sheet classes.
     */
    public function buildBrmData(string $branch, string $from, string $to): array
    {
        $items = DB::table('bill_items')
            ->where('branch', $branch)
            ->whereBetween('bill_date', [$from, $to])
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '')
            ->whereNotIn('status', ['Cancelled', 'Refunded'])
            ->selectRaw('patient_type, treating_doctor, treating_doctor_speciality, service_type, SUM(net_amount) AS total_amt, COUNT(*) AS row_count')
            ->groupBy('patient_type', 'treating_doctor', 'treating_doctor_speciality', 'service_type')
            ->get();

        $erCounts = DB::table('er_admissions')
            ->where('branch', $branch)
            ->whereBetween('admission_date', [$from, $to])
            ->whereNotNull('doctor_name')
            ->where('doctor_name', '!=', '')
            ->selectRaw('doctor_name, COUNT(*) as cnt')
            ->groupBy('doctor_name')
            ->pluck('cnt', 'doctor_name')
            ->toArray();

        $ipCounts = DB::table('ip_admissions')
            ->where('branch', $branch)
            ->whereBetween('admission_date', [$from, $to])
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '')
            ->selectRaw('treating_doctor, COUNT(*) as cnt')
            ->groupBy('treating_doctor')
            ->pluck('cnt', 'treating_doctor')
            ->toArray();

        $erip        = [];
        $opServices  = [];
        $opConsult   = [];
        $specialities = [];
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

            if ($spec && ! isset($specialities[$doc])) {
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
            'erip'         => $erip,
            'opServices'   => $opServices,
            'opConsult'    => $opConsult,
            'specialities' => $specialities,
            'erCols'       => $erColsArr,
            'ipCols'       => $ipColsArr,
            'opCols'       => $opColsArr,
            'erCounts'     => $erCounts,
            'ipCounts'     => $ipCounts,
        ];
    }
}
