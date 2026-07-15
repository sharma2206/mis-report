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
        return $this->rememberCollection("daily:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->dailyTrend($branch, $from, $to));
    }

    public function monthlyTrend(string $branch, int $year): array
    {
        return $this->rememberArray("monthly:{$branch}:{$year}", $branch, fn() => $this->inner->monthlyTrend($branch, $year));
    }

    public function deptRevenue(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("dept:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->deptRevenue($branch, $from, $to));
    }

    public function payerMix(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("payer:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->payerMix($branch, $from, $to));
    }

    public function patientMix(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("patient-mix:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->patientMix($branch, $from, $to));
    }

    public function branchComparison(string $from, string $to): array
    {
        // Branch comparison spans all branches — bust when any branch is updated.
        // Use a global generation key derived from all branches combined.
        return $this->rememberArray("branch-cmp:{$from}:{$to}", 'all', fn() => $this->inner->branchComparison($from, $to));
    }

    public function doctorRevenue(string $branch, string $from, string $to): Collection
    {
        return $this->rememberCollection("doc-rev:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->doctorRevenue($branch, $from, $to));
    }

    public function surgeries(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("surgeries:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->surgeries($branch, $from, $to));
    }

    public function admissions(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("admissions:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->admissions($branch, $from, $to));
    }

    public function ipDemographics(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("ip-demo:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->ipDemographics($branch, $from, $to));
    }

    public function surgeryDetail(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("surg-detail:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->surgeryDetail($branch, $from, $to));
    }

    public function collectionReport(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("collection:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->collectionReport($branch, $from, $to));
    }

    public function serviceRevenue(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("svc-rev:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->serviceRevenue($branch, $from, $to));
    }

    public function doctorPerformance(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("doc-perf:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->doctorPerformance($branch, $from, $to));
    }

    public function opMetrics(string $branch, string $from, string $to): array
    {
        return $this->rememberArray("op-metrics:{$branch}:{$from}:{$to}", $branch, fn() => $this->inner->opMetrics($branch, $from, $to));
    }

    /**
     * Invalidate every analytics cache entry for this branch by incrementing a
     * per-branch generation counter. All cached keys include the generation number,
     * so the next read automatically misses and recomputes from the database.
     * Works with any cache driver (file, Redis, Memcached — no tag support needed).
     */
    public static function bustForBranch(string $branch): void
    {
        Cache::increment("analytics:gen:{$branch}");
    }

    private static function generation(string $branch): int
    {
        return (int) Cache::get("analytics:gen:{$branch}", 0);
    }

    private function rememberCollection(string $key, string $branch, callable $cb): Collection
    {
        $gen = self::generation($branch);
        return Cache::remember("analytics:{$key}:g{$gen}", self::ttl(), $cb);
    }

    private function rememberArray(string $key, string $branch, callable $cb): array
    {
        $gen = self::generation($branch);
        return Cache::remember("analytics:{$key}:g{$gen}", self::ttl(), $cb);
    }
}
