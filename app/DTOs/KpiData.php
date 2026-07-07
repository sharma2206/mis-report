<?php

namespace App\DTOs;

class KpiData
{
    public function __construct(
        public readonly ?float $totalRevenue,
        public readonly int    $totalPatients,
        public readonly ?int   $opCount,
        public readonly ?int   $ipCount,
        public readonly ?int   $erCount,
        public readonly float  $discountAmount,
        public readonly ?float $netCollection,
        public readonly ?float $packageConsumption,
        public readonly ?float $pharmacySales,
        public readonly ?float $bedOccupancyPct,
        public readonly ?int   $bedOccupancy,
        public readonly int    $bedCount,
        public readonly float  $avgRevenuePerPatient,
        public readonly int    $surgeryCount,
        public readonly int    $majorSurgeries,
    ) {}

    public function toArray(): array
    {
        return [
            'total_revenue'           => $this->totalRevenue,
            'total_patients'          => $this->totalPatients,
            'op_count'                => $this->opCount,
            'ip_count'                => $this->ipCount,
            'er_count'                => $this->erCount,
            'discount_amount'         => $this->discountAmount,
            'net_collection'          => $this->netCollection,
            'package_consumption'     => $this->packageConsumption,
            'pharmacy_sales'          => $this->pharmacySales,
            'bed_occupancy_pct'       => $this->bedOccupancyPct,
            'bed_occupancy'           => $this->bedOccupancy,
            'bed_count'               => $this->bedCount,
            'avg_revenue_per_patient' => $this->avgRevenuePerPatient,
            'surgery_count'           => $this->surgeryCount,
            'major_surgeries'         => $this->majorSurgeries,
        ];
    }
}
