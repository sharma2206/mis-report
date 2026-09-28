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
        // Only 'Sale' rows — DB status values are 'Sale' and 'Refund'.
        // The previous whereNotIn('status',['Cancelled','Refunded']) matched nothing
        // because 'Refunded' ≠ 'Refund', so refund rows were silently included.
        $baseQuery = fn() => DB::table('bill_items')
            ->where('branch', $branch)
            ->whereBetween('bill_date', [$from, $to])
            ->where('status', 'Sale')
            ->whereNotNull('treating_doctor')
            ->where('treating_doctor', '!=', '');

        $items = $baseQuery()
            ->selectRaw('patient_type, treating_doctor, treating_doctor_speciality, service_type, SUM(net_amount) AS total_amt')
            ->groupBy('patient_type', 'treating_doctor', 'treating_doctor_speciality', 'service_type')
            ->get();

        // ER/IP visit counts: use DISTINCT visit_id from bill_items instead of the
        // admissions tables, which can be incomplete when patients are still admitted.
        $erCounts = $baseQuery()
            ->where('patient_type', 'ER')
            ->selectRaw('treating_doctor, COUNT(DISTINCT visit_id) as cnt')
            ->groupBy('treating_doctor')
            ->pluck('cnt', 'treating_doctor')
            ->toArray();

        $ipCounts = $baseQuery()
            ->where('patient_type', 'IP')
            ->selectRaw('treating_doctor, COUNT(DISTINCT visit_id) as cnt')
            ->groupBy('treating_doctor')
            ->pluck('cnt', 'treating_doctor')
            ->toArray();

        // Consultation visit counts: DISTINCT visit_id so multi-line bills count once.
        $opConsultVisits = $baseQuery()
            ->where('patient_type', 'OP')
            ->whereRaw("LOWER(service_type) LIKE '%consult%'")
            ->selectRaw('treating_doctor, COUNT(DISTINCT visit_id) as cnt')
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
                    // count comes from the separate DISTINCT visit_id query
                    $opConsult[$doc]['count']  = $opConsultVisits[$doc] ?? 0;
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
