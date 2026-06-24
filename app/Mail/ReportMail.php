<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class ReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array  $reportData,
        public readonly string $branch,
        public readonly string $date,
        public readonly string $pdfPath,    // temp file path on disk
    ) {}

    public function envelope(): Envelope
    {
        $branchLabel = ucfirst($this->branch);
        return new Envelope(
            subject: "MIS Report — {$branchLabel} — {$this->date}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.report',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->pdfPath)
                ->as("MIS_{$this->branch}_{$this->date}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
