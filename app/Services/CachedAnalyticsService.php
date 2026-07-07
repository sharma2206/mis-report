<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Caching decorator around AnalyticsService.
 * TTL: 15 minutes. Busted when data is imported or rolled back.
 */
class CachedAnalyticsService extends AnalyticsService
{
    public function __construct(private AnalyticsService $inner) {}

    private static function ttl(): int
    {
        return (int) config('cache.analytics_ttl', 900);
    }

    public function dailyTrend(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("daily:{$branch}:{$from}:{$to}", fn() => $this->inner->dailyTrend($branch, $from, $to));
    }

    public function monthlyTrend(string $branch, int $year): array
    {
        return $this->rememberArray("monthly:{$branch}:{$year}", fn() => $this->inner->monthlyTrend($branch, $year));
    }

    public function deptRevenue(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("dept:{$branch}:{$from}:{$to}", fn() => $this->inner->deptRevenue($branch, $from, $to));
    }

    public function payerMix(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("payer:{$branch}:{$from}:{$to}", fn() => $this->inner->payerMix($branch, $from, $to));
    }

    public function patientMix(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("patient-mix:{$branch}:{$from}:{$to}", fn() => $this->inner->patientMix($branch, $from, $to));
    }

    public function branchComparison(string $from, string $to): array
    {
        return $this->rememberArray("branch-cmp:{$from}:{$to}", fn() => $this->inner->branchComparison($from, $to));
    }

    public function doctorRevenue(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("doc-rev:{$branch}:{$from}:{$to}", fn() => $this->inner->doctorRevenue($branch, $from, $to));
    }

    public function surgeries(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("surgeries:{$branch}:{$from}:{$to}", fn() => $this->inner->surgeries($branch, $from, $to));
    }

    public function admissions(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("admissions:{$branch}:{$from}:{$to}", fn() => $this->inner->admissions($branch, $from, $to));
    }

    public function ipDemographics(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("ip-demo:{$branch}:{$from}:{$to}", fn() => $this->inner->ipDemographics($branch, $from, $to));
    }

    public function surgeryDetail(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("surg-detail:{$branch}:{$from}:{$to}", fn() => $this->inner->surgeryDetail($branch, $from, $to));
    }

    public function collectionReport(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("collection:{$branch}:{$from}:{$to}", fn() => $this->inner->collectionReport($branch, $from, $to));
    }

    public function serviceRevenue(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("svc-rev:{$branch}:{$from}:{$to}", fn() => $this->inner->serviceRevenue($branch, $from, $to));
    }

    public function doctorPerformance(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("doc-perf:{$branch}:{$from}:{$to}", fn() => $this->inner->doctorPerformance($branch, $from, $to));
    }

    public function opMetrics(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("op-metrics:{$branch}:{$from}:{$to}", fn() => $this->inner->opMetrics($branch, $from, $to));
    }

    public static function bustForBranch(string $branch): void
    {
        $today    = now()->format('Y-m-d');
        $prefixes = [
            'daily', 'dept', 'payer', 'patient-mix', 'doc-rev',
            'surgeries', 'admissions', 'ip-demo', 'surg-detail',
            'collection', 'svc-rev', 'doc-perf', 'op-metrics',
        ];
        foreach ($prefixes as $prefix) {
            Cache::forget("analytics:{$prefix}:{$branch}:{$today}:{$today}");
        }
    }

    private function rememberCollection(string $key, callable $cb): Collection
    {
        return Cache::remember("analytics:{$key}", self::ttl(), $cb);
    }

    private function rememberArray(string $key, callable $cb): array
    {
        return Cache::remember("analytics:{$key}", self::ttl(), $cb);
    }
}
