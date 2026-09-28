<?php

namespace App\Jobs;

use App\Exports\BRMExport;
use App\Mail\BrmReportMail;
use App\Models\AuditLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Maatwebsite\Excel\Facades\Excel;

class EmailBrmReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 180;

    public function __construct(
        private readonly string $branch,
        private readonly string $from,
        private readonly string $to,
        private readonly string $period,
        private readonly string $toEmail,
    ) {}

    public function handle(): void
    {
        $branchShort = strtoupper(substr($this->branch, 0, 3));
        $fromFmt     = \Carbon\Carbon::parse($this->from)->format('dMY');
        $toFmt       = \Carbon\Carbon::parse($this->to)->format('dMY');
        $filename    = "BRM-{$branchShort}-{$fromFmt}-{$toFmt}.xlsx";

        // Generate Excel bytes in memory
        $xlsxBytes = Excel::raw(
            new BRMExport($this->branch, $this->from, $this->to),
            \Maatwebsite\Excel\Excel::XLSX
        );

        // Write to temp file for mail attachment
        $tmpPath = tempnam(sys_get_temp_dir(), 'brm_') . '.xlsx';
        file_put_contents($tmpPath, $xlsxBytes);

        Mail::to($this->toEmail)->send(new BrmReportMail(
            branch:   $this->branch,
            from:     $this->from,
            to:       $this->to,
            period:   $this->period,
            xlsxPath: $tmpPath,
            filename: $filename,
        ));

        @unlink($tmpPath);

        AuditLog::record("brm_email_sent", [
            'period' => $this->period,
            'to'     => $this->toEmail,
            'from'   => $this->from,
            'to_date'=> $this->to,
        ], $this->branch, $this->from);
    }

    public function failed(\Throwable $e): void
    {
        AuditLog::record('brm_email_failed', [
            'to'    => $this->toEmail,
            'error' => $e->getMessage(),
        ], $this->branch, $this->from);
    }
}
