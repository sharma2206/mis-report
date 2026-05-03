<?php

namespace App\Jobs;

use App\Services\MISService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessMisReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 600;
    public int $backoff = 60;

    public function __construct(public string $reportDate) {}

    public function handle(MISService $misService): void
    {
        Log::info("Job started: ProcessMisReportJob for {$this->reportDate}");

        $misService->generate($this->reportDate);

        Log::info("Job completed: ProcessMisReportJob for {$this->reportDate}");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessMisReportJob failed for {$this->reportDate}: " . $exception->getMessage());
    }

    public function uniqueId(): string
    {
        return 'mis_report_' . $this->reportDate;
    }
}