<?php

namespace App\Repositories\Contracts;

use App\Enums\Branch;

interface MisRepositoryInterface
{
    public function getSalesData(Branch $branch, string $date): array;
    public function getCollectionData(Branch $branch, string $date): array;
    public function getDiscountData(Branch $branch, string $date): array;
    public function getRefundData(Branch $branch, string $date): array;
    public function getMriData(Branch $branch, string $date): array;
    public function getPackageAdjustment(Branch $branch, string $date): array;
    public function getVolumeData(Branch $branch, string $date): array;
    public function getPreviousMtdReports(Branch $branch, string $date): \Illuminate\Database\Eloquent\Collection;
}
