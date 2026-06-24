<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ─── Scheduled Reports ────────────────────────────────────────────────────────

// Daily: 7 AM every day — sends yesterday's report to all branch managers + admins
Schedule::command('mis:send-report all daily')
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduled-reports.log'));

// Weekly: Monday 8 AM — sends Sunday's report (end of last week)
Schedule::command('mis:send-report all weekly')
    ->weekly()->mondays()->at('08:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduled-reports.log'));

// Monthly: 1st of every month, 8 AM — sends last day of previous month report
Schedule::command('mis:send-report all monthly')
    ->monthlyOn(1, '08:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/scheduled-reports.log'));

// Housekeeping: prune failed jobs older than 7 days
Schedule::command('queue:prune-failed --hours=168')->weekly();
