<?php

namespace App\Services;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\ErAdmission;
use App\Models\HospitalBranch;
use App\Models\IpAdmission;
use App\Models\MisReport;
use App\Models\PackageConsumption;
use Illuminate\Database\Eloquent\Builder;

/**
 * Single source of truth for every KPI shown on the Dashboard, MIS report and BRM export.
 *
 * All values are derived from imported CSV data (bill items, cashier collections,
 * IP/ER admissions, package consumption) — nothing here accepts a manually entered
 * number. A method returns null when the underlying source report was never
 * uploaded for that branch/date; callers should render DashboardKpiService::NA_MESSAGE
 * instead of a numeric value in that case.
 */
class DashboardKpiService
{
    public const NA_MESSAGE = 'N/A (Source report not uploaded)';

    private const DEFAULT_SOURCES = [
        'bill'    => true,
        'cashier' => true,
        'package' => false,
        'er'      => false,
        'ip'      => false,
        'surgery' => false,
    ];

    public function calculateRevenue(Branch|string $branch, string $from, ?string $to = null, array $filters = []): ?float
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'bill')) return null;

        return round((float) $this->billBase($branch, $from, $to, $filters)->saleStatus()->sum('net_amount'), 2);
    }

    public function calculatePharmacyRevenue(Branch|string $branch, string $from, ?string $to = null, array $filters = []): ?float
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'bill')) return null;

        return round((float) $this->billBase($branch, $from, $to, $filters)
            ->where('service_type', 'Pharmacy')
            ->saleStatus()
            ->sum('net_amount'), 2);
    }

    public function calculateCashCollection(Branch|string $branch, string $from, ?string $to = null, array $filters = []): ?float
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'cashier')) return null;
        $to ??= $from;

        return round((float) CashierCollection::where('branch', $this->branchValue($branch))
            ->applyFilters($filters)
            ->whereDate('collection_date', '>=', $from)
            ->whereDate('collection_date', '<=', $to)
            ->sum('paid_amount'), 2);
    }

    public function calculatePackageRevenue(Branch|string $branch, string $from, ?string $to = null, array $filters = []): ?float
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'package')) return null;
        $to ??= $from;

        return round((float) PackageConsumption::where('branch', $this->branchValue($branch))
            // Note: If you implement applyFilters in PackageConsumption, add it here.
            ->whereDate('consumption_date', '>=', $from)
            ->whereDate('consumption_date', '<=', $to)
            ->sum('amount'), 2);
    }

    public function calculateOpCount(Branch|string $branch, string $from, ?string $to = null, array $filters = []): ?int
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'bill')) return null;

        return $this->billBase($branch, $from, $to, $filters)
            ->where('patient_type', 'OP')
            ->saleStatus()
            ->whereNotNull('uhid')
            ->selectRaw('COUNT(DISTINCT COALESCE(NULLIF(visit_id, ""), uhid)) as visit_count')
            ->value('visit_count');
    }

    /**
     * @param array|null $sources  Optional pre-resolved source flags (e.g. from the
     *                             upload currently in flight, before it's persisted).
     *                             When omitted, falls back to what's already stored.
     */
    public function calculateIpCount(Branch|string $branch, string $from, ?string $to = null, ?array $sources = null, array $filters = []): ?int
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'ip', $sources)) return null;
        $to ??= $from;

        return IpAdmission::where('branch', $this->branchValue($branch))
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $to)
            ->count();
    }

    public function calculateAdmissions(Branch|string $branch, string $from, ?string $to = null, ?array $sources = null): ?int
    {
        return $this->calculateIpCount($branch, $from, $to, $sources);
    }

    public function calculateDischarges(Branch|string $branch, string $from, ?string $to = null, ?array $sources = null): ?int
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'ip', $sources)) return null;
        $to ??= $from;

        return IpAdmission::where('branch', $this->branchValue($branch))
            ->whereDate('discharge_date', '>=', $from)
            ->whereDate('discharge_date', '<=', $to)
            ->count();
    }

    public function calculateErCount(Branch|string $branch, string $from, ?string $to = null, ?array $sources = null, array $filters = []): ?int
    {
        if (!$this->sourceAvailable($branch, $from, $to, 'er', $sources)) return null;
        $to ??= $from;

        return ErAdmission::where('branch', $this->branchValue($branch))
            ->applyFilters($filters)
            ->whereDate('admission_date', '>=', $from)
            ->whereDate('admission_date', '<=', $to)
            ->count();
    }

    /**
     * Currently admitted patients as of $date: admitted on/before $date and
     * not yet discharged (or discharged after $date).
     */
    public function calculateBedsOccupied(Branch|string $branch, string $date, ?array $sources = null): ?int
    {
        if (!$this->everUploaded($branch, 'ip')) return null;

        return IpAdmission::where('branch', $this->branchValue($branch))
            ->whereDate('admission_date', '<=', $date)
            ->where(function (Builder $q) use ($date) {
                $q->whereNull('discharge_date')->orWhereDate('discharge_date', '>', $date);
            })
            ->count();
    }

    public function calculateOccupancy(Branch|string $branch, string $date, ?array $sources = null): ?float
    {
        $occupied = $this->calculateBedsOccupied($branch, $date, $sources);
        if ($occupied === null) return null;

        $beds = (int) HospitalBranch::query()
            ->where('key', $this->branchValue($branch))
            ->value('bed_count');
        return $beds > 0 ? round(($occupied / $beds) * 100, 2) : 0.0;
    }

    /**
     * Normalised source-availability flags for a branch+date, as persisted at upload time.
     * No report row at all means nothing has ever been imported for that date.
     */
    public function sourcesFor(Branch|string $branch, string $date): array
    {
        $report = MisReport::where('branch', $this->branchValue($branch))->whereDate('report_date', $date)->first();
        if (!$report) {
            return array_fill_keys(array_keys(self::DEFAULT_SOURCES), false);
        }

        return array_merge(self::DEFAULT_SOURCES, (array) ($report->sources ?? []));
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function billBase(Branch|string $branch, string $from, ?string $to, array $filters = []): Builder
    {
        $to ??= $from;

        return BillItem::where('branch', $this->branchValue($branch))
            ->applyFilters($filters)
            ->whereDate('bill_date', '>=', $from)
            ->whereDate('bill_date', '<=', $to);
    }

    /**
     * `bill` and `cashier` are required on every upload, so they're always
     * available — a bare BillItem/CashierCollection table just means zero
     * revenue that day, not "not uploaded". `package` only ever exists for
     * Chromepet. `er`/`ip` are genuinely optional per upload, so:
     *
     * Single date (FTD): strict — requires the file to have been part of
     * that exact date's upload (per the persisted `sources` flag).
     *
     * Range (MTD/other): lenient — only checks the source has ever produced
     * data for this branch, so a monthly rollup isn't blocked by a single day
     * that only had the required bill/cashier files.
     */
    private function sourceAvailable(Branch|string $branch, string $from, ?string $to, string $key, ?array $sources = null): bool
    {
        if (in_array($key, ['bill', 'cashier'], true)) {
            return true;
        }

        if ($key === 'package') {
            return $this->branchValue($branch) === Branch::CHROMEPET->value;
        }

        // ip/er data spans date ranges — if data exists in the DB for this branch,
        // show the FTD count (may be 0) rather than N/A. Only gate on sources for
        // a same-day upload when the caller explicitly passes $sources (batch upload path).
        if ($sources !== null && $from === ($to ?? $from)) {
            $resolved = array_merge(self::DEFAULT_SOURCES, $sources);
            return $resolved[$key] ?? false;
        }

        return $this->everUploaded($branch, $key);
    }

    private function everUploaded(Branch|string $branch, string $key): bool
    {
        $branchKey = $this->branchValue($branch);

        return match ($key) {
            'bill'    => BillItem::where('branch', $branchKey)->exists(),
            'cashier' => CashierCollection::where('branch', $branchKey)->exists(),
            'package' => $branchKey === Branch::CHROMEPET->value && PackageConsumption::where('branch', $branchKey)->exists(),
            'er'      => ErAdmission::where('branch', $branchKey)->exists(),
            'ip'      => IpAdmission::where('branch', $branchKey)->exists(),
            default   => false,
        };
    }

    private function branchValue(Branch|string $branch): string
    {
        return $branch instanceof Branch ? $branch->value : $branch;
    }
}
