<?php

namespace App\Jobs;

use App\Mail\ReportMail;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class EmailReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    public function __construct(
        private readonly array  $reportData,
        private readonly string $to,
        private readonly string $branch,
        private readonly string $date,
    ) {}

    public function handle(): void
    {
        // Render PDF to a temp file
        $pdf     = Pdf::loadView('exports.mis_pdf', ['data' => $this->reportData])->setPaper('a4', 'landscape');
        $tmpPath = sys_get_temp_dir() . "/mis_{$this->branch}_{$this->date}_" . uniqid() . '.pdf';
        file_put_contents($tmpPath, $pdf->output());

        Mail::to($this->to)->send(new ReportMail(
            reportData: $this->reportData,
            branch:     $this->branch,
            date:       $this->date,
            pdfPath:    $tmpPath,
        ));

        @unlink($tmpPath);

        AuditLog::record('email_sent', [
            'to'     => $this->to,
            'branch' => $this->branch,
            'date'   => $this->date,
        ], $this->branch, $this->date);
    }

    public function failed(\Throwable $e): void
    {
        AuditLog::record('email_failed', [
            'to'    => $this->to,
            'error' => $e->getMessage(),
        ], $this->branch, $this->date);
    }
}
