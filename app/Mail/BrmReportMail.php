<?php

namespace App\Mail;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BrmReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $periodLabel;
    public string $fromFormatted;
    public string $toFormatted;

    public function __construct(
        public readonly string $branch,
        public readonly string $from,
        public readonly string $to,
        public readonly string $period,   // 'weekly' | 'monthly'
        public readonly string $xlsxPath,
        public readonly string $filename,
    ) {
        $this->periodLabel   = ucfirst($period);
        $this->fromFormatted = Carbon::parse($from)->format('d M Y');
        $this->toFormatted   = Carbon::parse($to)->format('d M Y');
    }

    public function envelope(): Envelope
    {
        $branchLabel = ucfirst($this->branch);
        $subject     = match ($this->period) {
            'monthly' => "BRM Monthly Report — {$branchLabel} — {$this->fromFormatted} to {$this->toFormatted}",
            default   => "BRM Weekly Report — {$branchLabel} — {$this->fromFormatted} to {$this->toFormatted}",
        };
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.brm_report');
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->xlsxPath)
                ->as($this->filename)
                ->withMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ];
    }
}
