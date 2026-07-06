<?php

namespace Tests\Unit;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\IpAdmission;
use App\Models\PackageConsumption;
use App\Repositories\MisRepository;
use App\Services\DashboardKpiService;
use App\Services\MISService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MisServiceTest extends TestCase
{
    use RefreshDatabase;

    private MISService $service;
    private string     $date = '2026-06-15';

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MISService(new MisRepository(), new DashboardKpiService());
    }

    public function test_generate_mis_returns_expected_structure(): void
    {
        $result = $this->service->generateMIS(Branch::CHROMEPET, $this->date);

        $this->assertArrayHasKey('sales',      $result);
        $this->assertArrayHasKey('collection', $result);
        $this->assertArrayHasKey('discount',   $result);
        $this->assertArrayHasKey('refund',     $result);
        $this->assertArrayHasKey('mri',        $result);
        $this->assertArrayHasKey('totals',     $result);
        $this->assertArrayHasKey('volume',     $result);
        $this->assertEquals('chromepet', $result['branch_key']);
    }

    public function test_chromepet_package_adjustment_applied_to_sales(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'IP', 'service_type' => 'Ward',
            'net_amount' => 20000, 'status' => 'Sale',
        ]);
        PackageConsumption::factory()->create([
            'branch' => 'chromepet', 'consumption_date' => $this->date, 'amount' => 5000,
        ]);

        $result = $this->service->generateMIS(Branch::CHROMEPET, $this->date);

        // IP should be reduced by package amount
        $this->assertEquals(15000.00, $result['sales']['ftd']['ip']);
        // PH should be increased by package amount
        $this->assertEquals(5000.00, $result['sales']['ftd']['ph']);
        // pkg_adjustment should be recorded separately
        $this->assertEquals(5000.00, $result['pkg_adjustment']['ftd']);
    }

    public function test_oragadam_does_not_apply_package_adjustment(): void
    {
        BillItem::factory()->forBranch('oragadam')->forDate($this->date)->create([
            'patient_type' => 'IP', 'service_type' => 'Ward',
            'net_amount' => 10000, 'status' => 'Sale',
        ]);

        $result = $this->service->generateMIS(Branch::ORAGADAM, $this->date);

        $this->assertEquals(10000.00, $result['sales']['ftd']['ip']);
        $this->assertEquals(0.00,     $result['pkg_adjustment']['ftd']);
    }

    public function test_totals_calculated_from_adjusted_sales(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'OP', 'service_type' => 'Consultation',
            'net_amount' => 4000, 'status' => 'Sale',
        ]);
        CashierCollection::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'OP', 'paid_amount' => 3000,
        ]);

        $result = $this->service->generateMIS(Branch::CHROMEPET, $this->date);

        $this->assertEquals(4000.00, $result['totals']['sales_ftd']);
        $this->assertEquals(3000.00, $result['totals']['collection_ftd']);
    }

    public function test_persists_report_to_database(): void
    {
        // 3 active admissions as of $this->date (admitted before/on date, not yet discharged)
        for ($i = 0; $i < 3; $i++) {
            IpAdmission::create(['branch' => 'oragadam', 'admission_date' => $this->date, 'discharge_date' => null]);
        }
        // 2 discharges on $this->date (bed freed same day — not counted as occupied)
        for ($i = 0; $i < 2; $i++) {
            IpAdmission::create(['branch' => 'oragadam', 'admission_date' => '2026-06-10', 'discharge_date' => $this->date]);
        }

        $this->service->generateMIS(Branch::ORAGADAM, $this->date, [
            'bill' => true, 'cashier' => true, 'ip' => true,
        ]);

        $this->assertDatabaseHas('mis_reports', [
            'branch' => 'oragadam',
        ]);

        $report = \App\Models\MisReport::where('branch', 'oragadam')->first();
        $this->assertNotNull($report);
        $this->assertEquals(3, $report->occupancy);
        $this->assertEquals(2, $report->discharge);
    }

    public function test_beds_occupied_is_na_when_ip_report_not_uploaded(): void
    {
        $result = $this->service->generateMIS(Branch::ORAGADAM, $this->date, ['bill' => true, 'cashier' => true]);

        $this->assertNull($result['volume']['ftd']['occupancy']);
        $this->assertNull($result['volume']['ftd']['admission']);
    }
}
