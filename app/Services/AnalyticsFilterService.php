<?php

namespace App\Services;

use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\IpAdmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class AnalyticsFilterService
{
    public function options(array|string $branches, User $user): array
    {
        $departmentScope = $user->department_list;

        return [
            'departments' => $this->mergeValues([
                $this->values(BillItem::class, 'treating_department', $branches),
                $this->values(IpAdmission::class, 'treating_department', $branches),
                $this->values(ErAdmission::class, 'treating_department', $branches),
            ])->when(
                $departmentScope !== [],
                fn (Collection $values) => $values->intersect($departmentScope)->values()
            )->all(),
            'specialties' => $this->mergeValues([
                $this->values(BillItem::class, 'treating_doctor_speciality', $branches),
                $this->values(IpAdmission::class, 'treating_doctor_speciality', $branches),
                $this->values(ErAdmission::class, 'doctor_speciality', $branches),
            ])->all(),
            'doctors' => $this->mergeValues([
                $this->values(BillItem::class, 'treating_doctor', $branches),
                $this->values(IpAdmission::class, 'treating_doctor', $branches),
                $this->values(ErAdmission::class, 'doctor_name', $branches),
            ])->all(),
            'payers' => $this->mergeValues([
                $this->values(BillItem::class, 'payer_name', $branches),
                $this->values(CashierCollection::class, 'payer_name', $branches),
                $this->values(IpAdmission::class, 'payer_name', $branches),
            ])->all(),
            'payer_types' => $this->mergeValues([
                $this->values(BillItem::class, 'payer_type', $branches),
                $this->values(CashierCollection::class, 'payer_type', $branches),
                $this->values(IpAdmission::class, 'payer_type', $branches),
            ])->all(),
            'wards' => $this->mergeValues([
                $this->values(BillItem::class, 'ward', $branches),
                $this->values(IpAdmission::class, 'ward', $branches),
                $this->values(ErAdmission::class, 'ward', $branches),
            ])->all(),
            'service_categories' => $this->values(BillItem::class, 'service_type', $branches)->all(),
            'patient_types' => $this->mergeValues([
                $this->values(BillItem::class, 'patient_type', $branches),
                $this->values(CashierCollection::class, 'patient_type', $branches),
            ])->all(),
            'payment_types' => $this->values(CashierCollection::class, 'payment_mode', $branches)->all(),
            'corporate' => $this->values(BillItem::class, 'corporate_name', $branches)->all(),
            'insurance' => $this->values(BillItem::class, 'insurance_company', $branches)->all(),
        ];
    }

    /**
     * @param class-string<Model> $model
     */
    private function values(string $model, string $column, array|string $branches): Collection
    {
        return $model::query()
            ->forBranch($branches)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->limit(500)
            ->pluck($column)
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->values();
    }

    private function mergeValues(array $collections): Collection
    {
        return collect($collections)
            ->flatten()
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique(fn ($value) => mb_strtolower($value))
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }
}
