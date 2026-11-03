<?php

namespace App\Jobs;

use App\Enums\Branch;
use App\Models\AuditLog;
use App\Services\CsvProcessingService;
use App\Services\MISService;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\UploadedFile;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Imports stored CSV files outside the HTTP request.
 * On the sync queue, dispatchSync runs this before the response is sent.
 */
class ProcessCsvImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 900;

    /**
     * @param  array<string, array{path:string, name:string}>  $files
     */
    public function __construct(
        private readonly string $branch,
        private readonly string $date,
        private readonly array $files,
        private readonly ?int $userId,
        private readonly string $uploadedBy,
        private readonly ?int $tenantId,
        private readonly bool $single,
    ) {}

    /**
     * @return array{imported: array, report: mixed, report_type: ?string}
     */
    public function handle(CsvProcessingService $csv, MISService $mis): array
    {
        $tenantId = $this->tenantId ?: TenantContext::defaultId();
        if ($tenantId) {
            TenantContext::set((int) $tenantId);
        }

        try {
            $uploads = $this->rehydrate();
            $branchEnum = Branch::from($this->branch);

            $imported = $csv->process(
                branch: $branchEnum,
                date: $this->date,
                billFile: $uploads['bill'] ?? null,
                cashierFile: $uploads['cashier'] ?? null,
                packageFile: $uploads['package'] ?? null,
                erFile: $uploads['er'] ?? null,
                ipFile: $uploads['ip'] ?? null,
                surgeryFile: $uploads['surgery'] ?? null,
                userId: $this->userId,
                uploadedBy: $this->uploadedBy,
            );

            $sources = $imported['sources'] ?? [];
            $report = $mis->generateMIS($branchEnum, $this->date, $sources);
            $reportType = $this->single ? array_key_first($this->files) : null;

            AuditLog::record($this->single ? 'upload_single' : 'upload', [
                'branch' => $this->branch,
                'date' => $this->date,
                'type' => $reportType,
                'imported' => array_diff_key($imported, ['sources' => null, 'logs' => null]),
                'sources' => $sources,
                'queued' => true,
            ], $this->branch, $this->date);

            $this->deleteStoredFiles();

            return [
                'imported' => $imported,
                'report' => $report,
                'report_type' => $reportType,
            ];
        } finally {
            TenantContext::forget();
        }
    }

    /**
     * @return array<string, UploadedFile>
     */
    private function rehydrate(): array
    {
        $uploads = [];

        foreach ($this->files as $key => $meta) {
            $uploads[$key] = new UploadedFile(
                Storage::disk('local')->path($meta['path']),
                $meta['name'],
                'text/csv',
                null,
                true,
            );
        }

        return $uploads;
    }

    private function deleteStoredFiles(): void
    {
        $paths = array_column($this->files, 'path');
        if ($paths !== []) {
            Storage::disk('local')->delete($paths);
        }
    }
}
