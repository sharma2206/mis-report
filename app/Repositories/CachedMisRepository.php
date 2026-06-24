<?php

namespace App\Repositories;

use App\Enums\Branch;
use App\Repositories\Contracts\MisRepositoryInterface;
use Illuminate\Support\Facades\Cache;

/**
 * Caching decorator around MisRepository.
 * TTL: 15 minutes. Cache is busted on CSV upload (CsvProcessingService calls Cache::tags).
 */
class CachedMisRepository implements MisRepositoryInterface
{
    private const TTL = 900; // 15 minutes

    public function __construct(private MisRepository $inner) {}

    public function getSalesData(Branch $branch, string $date): array
    {
        return $this->remember("sales:{$branch->value}:{$date}", fn() => $this->inner->getSalesData($branch, $date));
    }

    public function getCollectionData(Branch $branch, string $date): array
    {
        return $this->remember("collection:{$branch->value}:{$date}", fn() => $this->inner->getCollectionData($branch, $date));
    }

    public function getDiscountData(Branch $branch, string $date): array
    {
        return $this->remember("discount:{$branch->value}:{$date}", fn() => $this->inner->getDiscountData($branch, $date));
    }

    public function getRefundData(Branch $branch, string $date): array
    {
        return $this->remember("refund:{$branch->value}:{$date}", fn() => $this->inner->getRefundData($branch, $date));
    }

    public function getMriData(Branch $branch, string $date): array
    {
        return $this->remember("mri:{$branch->value}:{$date}", fn() => $this->inner->getMriData($branch, $date));
    }

    public function getPackageAdjustment(Branch $branch, string $date): array
    {
        return $this->remember("pkg:{$branch->value}:{$date}", fn() => $this->inner->getPackageAdjustment($branch, $date));
    }

    public function getVolumeData(Branch $branch, string $date): array
    {
        return $this->remember("vol:{$branch->value}:{$date}", fn() => $this->inner->getVolumeData($branch, $date));
    }

    public function getPreviousMtdReports(Branch $branch, string $date): \Illuminate\Database\Eloquent\Collection
    {
        return $this->remember("mtd_reports:{$branch->value}:{$date}", fn() => $this->inner->getPreviousMtdReports($branch, $date));
    }

    public static function bustFor(string $branch, string $date): void
    {
        $keys = ['sales', 'collection', 'discount', 'refund', 'mri', 'pkg', 'vol', 'mtd_reports'];
        foreach ($keys as $k) {
            Cache::forget("mis:{$k}:{$branch}:{$date}");
        }
    }

    private function remember(string $key, callable $cb): mixed
    {
        return Cache::remember("mis:{$key}", self::TTL, $cb);
    }
}
