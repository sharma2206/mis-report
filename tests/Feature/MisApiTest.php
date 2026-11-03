<?php

namespace Tests\Feature;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\MisReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * MisApiTest — Feature tests for the MIS Report API.
 *
 * All API endpoints are prefixed with /api/v1/ per routes/api.php.
 * Authentication uses actingAs() which triggers Sanctum SPA session guard,
 * matching the production SPA auth flow.
 *
 * Tests that call generateMIS() internally (show, export, email) hit
 * buildMtdVolume() which uses MySQL-specific raw SQL (GREATEST, DATEDIFF).
 * Those tests are skipped on SQLite to avoid false failures; they should
 * be run against a MySQL test database in CI.
 */
class MisApiTest extends TestCase
{
    use RefreshDatabase;

    private User   $admin;
    private string $date = '2026-06-15';

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'branch' => null, 'is_active' => true]);
    }

    private function authed(): self
    {
        return $this->actingAs($this->admin);
    }

    /** Skip on SQLite — test uses MySQL-specific raw SQL in MISService::buildMtdVolume(). */
    private function skipIfSqlite(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped(
                'This test requires MySQL for GREATEST/DATEDIFF/LEAST raw SQL functions. ' .
                'Run against a MySQL test database in CI (set DB_CONNECTION=mysql in phpunit.xml).'
            );
        }
    }

    // ─── GET /api/v1/mis/{branch}/{date} ──────────────────────────────────────

    public function test_show_returns_report_structure(): void
    {
        $this->skipIfSqlite();

        $this->authed()->getJson("/api/v1/mis/chromepet/{$this->date}")
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => ['sales', 'collection', 'totals', 'volume']]);
    }

    public function test_show_requires_auth(): void
    {
        $this->getJson("/api/v1/mis/chromepet/{$this->date}")->assertUnauthorized();
    }

    public function test_branch_manager_cannot_access_other_branch(): void
    {
        $manager = User::factory()->create(['role' => 'manager', 'branch' => 'oragadam', 'is_active' => true]);

        $this->actingAs($manager)->getJson("/api/v1/mis/chromepet/{$this->date}")
            ->assertForbidden();
    }

    public function test_branch_manager_can_access_own_branch(): void
    {
        $this->skipIfSqlite();

        $manager = User::factory()->create(['role' => 'manager', 'branch' => 'chromepet', 'is_active' => true]);

        $this->actingAs($manager)->getJson("/api/v1/mis/chromepet/{$this->date}")->assertOk();
    }

    // ─── Analytics KPI ────────────────────────────────────────────────────────

    public function test_kpi_endpoint_returns_expected_keys(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->count(5)->create(['status' => 'Sale']);

        $this->authed()->getJson("/api/v1/analytics/kpi/chromepet/{$this->date}")
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => [
                'total_revenue', 'total_patients', 'op_count', 'ip_count',
                'discount_amount', 'net_collection', 'pharmacy_sales',
                'bed_occupancy_pct', 'avg_revenue_per_patient',
            ]]);
    }

    public function test_kpi_total_revenue_sums_sale_net_amount(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'net_amount' => 10000, 'status' => 'Sale', 'patient_type' => 'OP',
        ]);
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'net_amount' => 5000, 'status' => 'Sale', 'patient_type' => 'IP',
        ]);

        $response = $this->authed()->getJson("/api/v1/analytics/kpi/chromepet/{$this->date}");
        $this->assertEquals(15000, $response->json('data.total_revenue'));
    }

    // ─── Analytics Charts ─────────────────────────────────────────────────────

    public function test_daily_trend_returns_array(): void
    {
        $this->authed()->getJson("/api/v1/analytics/charts/daily-trend?branch=chromepet&from=2026-06-01&to={$this->date}")
            ->assertOk()
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_payer_mix_groups_by_payer_type(): void
    {
        CashierCollection::factory()->forBranch('chromepet')->forDate($this->date)->count(3)->create([
            'payer_type' => 'Insurance', 'paid_amount' => 1000,
        ]);
        CashierCollection::factory()->forBranch('chromepet')->forDate($this->date)->count(2)->create([
            'payer_type' => 'Self', 'paid_amount' => 2000,
        ]);

        $response = $this->authed()->getJson("/api/v1/analytics/charts/payer-mix?branch=chromepet&from={$this->date}&to={$this->date}");
        $response->assertOk();
        $data = collect($response->json('data'));
        $this->assertGreaterThanOrEqual(2, $data->count());
    }

    public function test_patient_mix_returns_day_rows(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->count(3)->create([
            'status' => 'Sale', 'patient_type' => 'OP',
        ]);

        $response = $this->authed()->getJson("/api/v1/analytics/charts/patient-mix?branch=chromepet&from={$this->date}&to={$this->date}");
        $response->assertOk()->assertJsonStructure(['data']);
        $this->assertNotEmpty($response->json('data'));
    }

    // ─── Export endpoints ─────────────────────────────────────────────────────

    public function test_excel_export_returns_file(): void
    {
        $this->skipIfSqlite();

        $this->authed()->get("/api/v1/mis/chromepet/{$this->date}/export")
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_csv_export_returns_file(): void
    {
        $this->skipIfSqlite();

        $this->authed()->get("/api/v1/mis/chromepet/{$this->date}/export-csv")
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    // ─── Email report ─────────────────────────────────────────────────────────

    public function test_email_report_queues_job(): void
    {
        $this->skipIfSqlite();

        \Illuminate\Support\Facades\Queue::fake();

        $this->authed()->postJson("/api/v1/mis/chromepet/{$this->date}/email", ['to' => 'manager@test.com'])
            ->assertOk()
            ->assertJsonPath('success', true);

        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\EmailReportJob::class);
    }

    // ─── Print preview (web route, session auth) ──────────────────────────────

    public function test_print_preview_requires_authentication(): void
    {
        $this->get("/print/chromepet/{$this->date}")
            ->assertUnauthorized();
    }

    public function test_print_preview_denies_other_branch(): void
    {
        $manager = User::factory()->manager('chromepet')->create();

        $this->actingAs($manager)
            ->get("/print/oragadam/{$this->date}")
            ->assertForbidden();
    }
}
