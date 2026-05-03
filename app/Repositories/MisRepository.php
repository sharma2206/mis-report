<?php

namespace App\Repositories;

use App\Enums\BillStatus;
use App\Enums\PatientType;
use App\Enums\ServiceType;
use App\Enums\SubDepartment;
use App\Models\BillItem;
use App\Models\Collection;
use App\Models\PackageConsumption;
use App\Repositories\Contracts\MisRepositoryInterface;

class MisRepository implements MisRepositoryInterface
{
    /**
     * Sales grouped by patient type (OP, IP, ER) using net_amount.
     */
    public function salesByPatientType(string $date): array
    {
        $rows = BillItem::forDate($date)
            ->where('status', '!=', BillStatus::REFUND)
            ->selectRaw('patient_type, SUM(net_amount) as total')
            ->groupBy('patient_type')
            ->pluck('total', 'patient_type')
            ->toArray();

        return [
            'op' => (float) ($rows[PatientType::OP] ?? 0),
            'ip' => (float) ($rows[PatientType::IP] ?? 0),
            'er' => (float) ($rows[PatientType::ER] ?? 0),
        ];
    }

    /**
     * Pharmacy sales (from bill_items where service_type = Pharmacy).
     */
    public function pharmacySales(string $date): float
    {
        return (float) BillItem::forDate($date)
            ->ofServiceType(ServiceType::PHARMACY)
            ->where('status', '!=', BillStatus::REFUND)
            ->sum('net_amount');
    }

    /**
     * Pharmacy package consumed value.
     */
    public function pharmacyPackageValue(string $date): float
    {
        return (float) PackageConsumption::forDate($date)
            ->where('service_type', ServiceType::PHARMACY)
            ->sum('value');
    }

    /**
     * Collection grouped by patient type using paid_amount.
     */
    public function collectionByPatientType(string $date): array
    {
        $rows = Collection::forDate($date)
            ->selectRaw('patient_type, SUM(paid_amount) as total')
            ->groupBy('patient_type')
            ->pluck('total', 'patient_type')
            ->toArray();

        return [
            'op' => (float) ($rows[PatientType::OP] ?? 0),
            'ip' => (float) ($rows[PatientType::IP] ?? 0),
            'er' => (float) ($rows[PatientType::ER] ?? 0),
        ];
    }

    /**
     * 100% Discount = where net_amount is 0, sum amount.
     */
    public function discount100(string $date): float
    {
        return (float) BillItem::forDate($date)
            ->where('net_amount', 0)
            ->where('amount', '>', 0)
            ->sum('amount');
    }

    /**
     * 99% Discount = where net_amount != 0 and discount > 0, sum discount amount.
     */
    public function discount99(string $date): float
    {
        return (float) BillItem::forDate($date)
            ->where('net_amount', '!=', 0)
            ->where('discount', '>', 0)
            ->sum('discount');
    }

    /**
     * Refund = items with status='Refund', sum net_amount.
     */
    public function refundTotal(string $date): float
    {
        return (float) abs(
            BillItem::forDate($date)
                ->where('status', BillStatus::REFUND)
                ->sum('net_amount')
        );
    }

    /**
     * MRI metrics filtered by sub_department='MRI'.
     */
    public function mriMetrics(string $date): array
    {
        $base = BillItem::forDate($date)
            ->where('sub_department', SubDepartment::MRI)
            ->where('status', '!=', BillStatus::REFUND);

        $opCount = (clone $base)
            ->where('patient_type', PatientType::OP)
            ->distinct('patient_id')
            ->count('patient_id');

        $ipCount = (clone $base)
            ->where('patient_type', PatientType::IP)
            ->distinct('patient_id')
            ->count('patient_id');

        $opRevenue = (float) (clone $base)
            ->where('patient_type', PatientType::OP)
            ->sum('net_amount');

        $ipRevenue = (float) (clone $base)
            ->where('patient_type', PatientType::IP)
            ->sum('net_amount');

        return [
            'op_count'   => $opCount,
            'ip_count'   => $ipCount,
            'op_revenue' => $opRevenue,
            'ip_revenue' => $ipRevenue,
        ];
    }

    /**
     * Total OP Count from OP Consultation rows.
     */
    public function totalOpCount(string $date): int
    {
        return (int) BillItem::forDate($date)
            ->ofServiceType(ServiceType::OP_CONSULTATION)
            ->where('status', '!=', BillStatus::REFUND)
            ->sum('quantity');
    }
}
