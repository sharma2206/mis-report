<?php

namespace App\Console\Commands;

use App\Enums\Branch;
use App\Jobs\EmailBrmReportJob;
use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendBrmReport extends Command
{
    protected $signature = 'brm:send-report
                            {branch : chromepet|oragadam|all}
                            {period : weekly|monthly}
                            {--from= : Override from date (Y-m-d)}
                            {--to=   : Override to date (Y-m-d)}
                            {--email=* : Override recipient emails}';

    protected $description = 'Generate and email BRM (Business Revenue Management) reports — weekly or monthly';

    public function handle(): int
    {
        $period     = $this->argument('period');
        $branchArg  = $this->argument('branch');
        $overEmails = $this->option('email');

        [$from, $to] = $this->resolveDateRange($period);

        $branches = $branchArg === 'all' ? Branch::cases() : [Branch::from($branchArg)];

        $this->info("BRM {$period} report: {$from} → {$to}");

        foreach ($branches as $branchEnum) {
            $this->info("  Branch: {$branchEnum->value}");

            $recipients = $overEmails ?: $this->recipientsFor($branchEnum);

            if (empty($recipients)) {
                $this->warn("    No recipients for {$branchEnum->value}. Skipping.");
                continue;
            }

            foreach ($recipients as $email) {
                EmailBrmReportJob::dispatch(
                    $branchEnum->value, $from, $to, $period, $email
                );
                $this->line("    → Queued to {$email}");
            }

            AuditLog::record("scheduled_brm_{$period}", [
                'recipients' => $recipients,
                'from'       => $from,
                'to'         => $to,
            ], $branchEnum->value, $from);
        }

        $this->info('Done.');
        return Command::SUCCESS;
    }

    /**
     * Resolve from/to based on period or manual overrides.
     * weekly  → previous Monday to Sunday
     * monthly → 1st to last day of previous month
     */
    private function resolveDateRange(string $period): array
    {
        $fromOverride = $this->option('from');
        $toOverride   = $this->option('to');

        if ($fromOverride && $toOverride) {
            return [$fromOverride, $toOverride];
        }

        $today = Carbon::today();

        if ($period === 'monthly') {
            // Last day of the month schedule: report covers 1st to today
            // (run at month end, so "today" is the last day)
            $from = $today->copy()->startOfMonth()->toDateString();
            $to   = $today->toDateString();
            return [$from, $to];
        }

        // weekly: Monday schedule → covers last week Mon-Sun
        // If today is Monday, report previous Mon–Sun
        $lastMonday = $today->copy()->startOfWeek(Carbon::MONDAY)->subWeek();
        $lastSunday = $lastMonday->copy()->endOfWeek(Carbon::SUNDAY);
        return [
            $lastMonday->toDateString(),
            $lastSunday->toDateString(),
        ];
    }

    private function recipientsFor(Branch $branch): array
    {
        return User::where('is_active', true)
            ->where(fn($q) => $q->whereNull('branch')->orWhere('branch', $branch->value))
            ->whereIn('role', ['admin', 'manager'])
            ->pluck('email')
            ->toArray();
    }
}
