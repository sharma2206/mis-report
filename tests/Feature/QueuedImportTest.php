<?php

namespace Tests\Feature;

use App\Jobs\ProcessCsvImportJob;
use App\Models\ImportLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class QueuedImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_is_queued_when_the_queue_is_not_sync(): void
    {
        Storage::fake('local');
        Queue::fake();
        config(['queue.default' => 'database']);

        $admin = User::factory()->admin()->create();
        $date = now()->toDateString();
        $csv = UploadedFile::fake()->create('bill.csv', 1, 'text/csv');
        $cashier = UploadedFile::fake()->create('cashier.csv', 1, 'text/csv');

        $response = $this->actingAs($admin)->post("/api/v1/mis/oragadam/upload", [
            'date' => $date,
            'bill_file' => $csv,
            'cashier_file' => $cashier,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(202)
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true);

        Queue::assertPushed(ProcessCsvImportJob::class, function (ProcessCsvImportJob $job) {
            return true;
        });

        $this->assertSame(2, ImportLog::where('status', 'processing')->count());
    }
}
