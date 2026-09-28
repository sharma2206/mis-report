<?php

namespace App\Console\Commands;

use App\Enums\Branch;
use App\Jobs\EmailReportJob;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\MISService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendMisReport extends Command
{
    protected $signature = 'mis:send-report
                            {branch : chromepet|oragadam|all}
                            {period : daily|weekly|monthly}
                            {--date= : Override date (Y-m-d), defaults to yesterday}
                            {--email=* : Override recipient emails}';

    protected $description = 'Generate and email MIS reports on a schedule';

    public function __construct(private MISService $misService) { parent::__construct(); }

    public function handle(): int
    {
        $period    = $this->argument('period');
        $branchArg = $this->argument('branch');
        $date      = $this->option('date') ?: Carbon::yesterday()->toDateString();
        $overrideEmails = $this->option('email');

        $branches = $branchArg === 'all' ? Branch::cases() : [Branch::from($branchArg)];

        foreach ($branches as $branchEnum) {
            $this->info("Generating {$period} report for {$branchEnum->value} on {$date}…");

            try {
                $data = $this->misService->generateMIS($branchEnum, $date);

                $recipients = $overrideEmails ?: $this->recipientsFor($branchEnum);

                if (empty($recipients)) {
                    $this->warn("  No recipients configured for {$branchEnum->value}. Skipping.");
                    continue;
                }

                foreach ($recipients as $email) {
                    EmailReportJob::dispatch($data, $email, $branchEnum->value, $date);
                    $this->line("  → Queued to {$email}");
                }

                AuditLog::record("scheduled_{$period}_report", [
                    'recipients' => $recipients,
                    'date'       => $date,
                ], $branchEnum->value, $date);

            } catch (\Throwable $e) {
                $this->error("  Failed: " . $e->getMessage());
                AuditLog::record("scheduled_report_failed", ['error' => $e->getMessage()], $branchEnum->value, $date);
                return Command::FAILURE;
            }
        }

        $this->info('Done.');
        return Command::SUCCESS;
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
