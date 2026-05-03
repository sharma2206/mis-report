<?php

namespace App\Repositories\Contracts;

interface MisRepositoryInterface
{
    public function salesByPatientType(string $date): array;

    public function pharmacySales(string $date): float;

    public function pharmacyPackageValue(string $date): float;

    public function collectionByPatientType(string $date): array;

    public function discount100(string $date): float;

    public function discount99(string $date): float;

    public function refundTotal(string $date): float;

    public function mriMetrics(string $date): array;

    public function totalOpCount(string $date): int;
}
