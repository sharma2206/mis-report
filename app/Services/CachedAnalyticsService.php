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

    public function dailyTrend($branch, string $from, string $to, array $filters = []): Collection
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberCollection("daily:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->dailyTrend($branch, $from, $to, $filters));
    }

    public function monthlyTrend($branch, int $year, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("monthly:{$bKey}:{$year}{$fKey}", $branch, fn() => $this->inner->monthlyTrend($branch, $year, $filters));
    }

    public function deptRevenue($branch, string $from, string $to, array $filters = []): Collection
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberCollection("dept:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->deptRevenue($branch, $from, $to, $filters));
    }

    public function payerMix($branch, string $from, string $to, array $filters = []): Collection
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberCollection("payer:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->payerMix($branch, $from, $to, $filters));
    }

    public function patientMix($branch, string $from, string $to, array $filters = []): Collection
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberCollection("patient-mix:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->patientMix($branch, $from, $to, $filters));
    }

    public function branchComparison(string $from, string $to): array
    {
        // Branch comparison spans all branches — bust when any branch is updated.
        // Use a global generation key derived from all branches combined.
        return $this->rememberArray("branch-cmp:{$from}:{$to}", 'all', fn() => $this->inner->branchComparison($from, $to));
    }

    public function doctorRevenue($branch, string $from, string $to, array $filters = []): Collection
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberCollection("doc-rev:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->doctorRevenue($branch, $from, $to, $filters));
    }

    public function surgeries($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("surgeries:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->surgeries($branch, $from, $to, $filters));
    }

    public function admissions($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("admissions:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->admissions($branch, $from, $to, $filters));
    }

    public function ipDemographics($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("ip-demo:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->ipDemographics($branch, $from, $to, $filters));
    }

    public function surgeryDetail($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("surg-detail:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->surgeryDetail($branch, $from, $to, $filters));
    }

    public function collectionReport($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("collection:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->collectionReport($branch, $from, $to, $filters));
    }

    public function serviceRevenue($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("svc-rev:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->serviceRevenue($branch, $from, $to, $filters));
    }

    public function doctorPerformance($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("doc-perf:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->doctorPerformance($branch, $from, $to, $filters));
    }

    public function opMetrics($branch, string $from, string $to, array $filters = []): array
    {
        $bKey = $this->resolveBranchKey($branch);
        $fKey = $this->resolveFilterKey($filters);
        return $this->rememberArray("op-metrics:{$bKey}:{$from}:{$to}{$fKey}", $branch, fn() => $this->inner->opMetrics($branch, $from, $to, $filters));
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

    private static function generation($branch): int
    {
        $branches = is_array($branch) ? $branch : explode(',', $branch);
        $gen = 0;
        foreach ($branches as $b) {
            $gen += (int) Cache::get("analytics:gen:{$b}", 0);
        }
        return $gen;
    }

    private function resolveBranchKey($branch): string
    {
        return is_array($branch) ? implode(',', $branch) : $branch;
    }

    private function resolveFilterKey(array $filters): string
    {
        return empty($filters) ? '' : ':' . md5(json_encode($filters));
    }

    private function rememberCollection(string $key, $branch, callable $cb): Collection
    {
        $gen = self::generation($branch);
        return Cache::remember("analytics:{$key}:g{$gen}", self::ttl(), $cb);
    }

    private function rememberArray(string $key, $branch, callable $cb): array
    {
        $gen = self::generation($branch);
        return Cache::remember("analytics:{$key}:g{$gen}", self::ttl(), $cb);
    }
}
