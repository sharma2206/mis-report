<?php

namespace App\Services;

use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\PackageConsumption;
use App\Models\SourceCapability;
use App\Models\Surgery;

class SourceCapabilityService
{
    private const CATALOG = [
        'billing' => ['label' => 'Billing', 'capabilities' => ['revenue', 'op_visits', 'services', 'discounts']],
        'collections' => ['label' => 'Collections', 'capabilities' => ['collections', 'payment_modes', 'receipts']],
        'ip' => ['label' => 'IP Admissions', 'capabilities' => ['admissions', 'discharges', 'occupancy', 'los']],
        'er' => ['label' => 'Emergency', 'capabilities' => ['er_admissions']],
        'surgery' => ['label' => 'OT / Surgery', 'capabilities' => ['surgeries', 'ot_activity']],
        'packages' => ['label' => 'Packages', 'capabilities' => ['package_consumption']],
        'inventory' => ['label' => 'Inventory', 'capabilities' => []],
        'laboratory' => ['label' => 'Laboratory', 'capabilities' => []],
        'radiology' => ['label' => 'Radiology', 'capabilities' => []],
        'insurance_claims' => ['label' => 'Insurance Claims', 'capabilities' => []],
        'bed_movement' => ['label' => 'Bed Movement', 'capabilities' => []],
    ];

    public function catalog(): array
    {
        $stored = SourceCapability::query()->get()->keyBy('source_key');
        $detected = [
            'billing' => BillItem::query()->exists(),
            'collections' => CashierCollection::query()->exists(),
            'ip' => IpAdmission::query()->exists(),
            'er' => ErAdmission::query()->exists(),
            'surgery' => Surgery::query()->exists(),
            'packages' => PackageConsumption::query()->exists(),
        ];

        return collect(self::CATALOG)->map(function (array $definition, string $key) use ($stored, $detected) {
            $record = $stored->get($key);
            $status = $record?->status
                ?? (($detected[$key] ?? false) ? 'connected' : 'not_connected');

            return [
                'key' => $key,
                'label' => $definition['label'],
                'status' => $status,
                'adapter' => $record?->adapter,
                'last_synced_at' => $record?->last_synced_at?->toISOString(),
                'capabilities' => $record?->capabilities ?? $definition['capabilities'],
                'metadata' => $record?->metadata ?? [],
            ];
        })->values()->all();
    }
}
