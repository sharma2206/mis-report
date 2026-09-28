<?php

namespace Tests\Unit;

use App\Enums\Branch;
use App\Models\BillItem;
use App\Models\CashierCollection;
use App\Models\PackageConsumption;
use App\Repositories\MisRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MisRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private MisRepository $repo;
    private string $date = '2026-06-15';

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new MisRepository();
    }

    // ─── getSalesData ────────────────────────────────────────────────────────

    public function test_sales_ftd_sums_net_amount_for_sale_and_refund(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'OP', 'service_type' => 'Consultation', 'net_amount' => 5000, 'status' => 'Sale',
        ]);
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'IP', 'service_type' => 'Ward', 'net_amount' => 10000, 'status' => 'Refund',
        ]);
        // Different date — must NOT be counted in FTD
        BillItem::factory()->forBranch('chromepet')->forDate('2026-06-10')->create([
            'patient_type' => 'OP', 'service_type' => 'Consultation', 'net_amount' => 99999, 'status' => 'Sale',
        ]);

        $result = $this->repo->getSalesData(Branch::CHROMEPET, $this->date);

        $this->assertEquals(5000.00, $result['ftd']['op']);
        $this->assertEquals(10000.00, $result['ftd']['ip']);
        $this->assertEquals(0.00, $result['ftd']['er']);
    }

    public function test_pharmacy_sales_classified_by_service_type(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => null, 'service_type' => 'Pharmacy', 'net_amount' => 3000, 'status' => 'Sale',
        ]);

        $result = $this->repo->getSalesData(Branch::CHROMEPET, $this->date);
        $this->assertEquals(3000.00, $result['ftd']['ph']);
    }

    public function test_sales_mtd_includes_all_month_dates(): void
    {
        // Two dates in the same month
        foreach (['2026-06-01', '2026-06-10', $this->date] as $d) {
            BillItem::factory()->forBranch('chromepet')->forDate($d)->create([
                'patient_type' => 'OP', 'service_type' => 'Consultation', 'net_amount' => 1000, 'status' => 'Sale',
            ]);
        }

        $result = $this->repo->getSalesData(Branch::CHROMEPET, $this->date);
        $this->assertEquals(3000.00, $result['mtd']['op']);
    }

    // ─── getCollectionData ───────────────────────────────────────────────────

    public function test_collection_sums_paid_amount_by_patient_type(): void
    {
        CashierCollection::factory()->forBranch('oragadam')->forDate($this->date)->create([
            'patient_type' => 'OP', 'paid_amount' => 2000,
        ]);
        CashierCollection::factory()->forBranch('oragadam')->forDate($this->date)->create([
            'patient_type' => 'IP', 'paid_amount' => 8000,
        ]);
        CashierCollection::factory()->forBranch('oragadam')->forDate($this->date)->create([
            'patient_type' => null, 'paid_amount' => 1500,
        ]);

        $result = $this->repo->getCollectionData(Branch::ORAGADAM, $this->date);
        $this->assertEquals(2000.00, $result['ftd']['op']);
        $this->assertEquals(8000.00, $result['ftd']['ip']);
        $this->assertEquals(1500.00, $result['ftd']['ph']);
    }

    // ─── getDiscountData ─────────────────────────────────────────────────────

    public function test_partial_discount_when_net_amount_not_zero(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'OP', 'service_type' => 'Consultation',
            'amount' => 1000, 'net_amount' => 800, 'status' => 'Sale',
        ]);

        $result = $this->repo->getDiscountData(Branch::CHROMEPET, $this->date);
        $this->assertEquals(1000.00, $result['ftd']['partial']['op']);
        $this->assertEquals(0.00,    $result['ftd']['full']['op']);
    }

    public function test_full_discount_when_net_amount_is_zero(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'IP', 'service_type' => 'Ward',
            'amount' => 5000, 'net_amount' => 0, 'status' => 'Sale',
        ]);

        $result = $this->repo->getDiscountData(Branch::CHROMEPET, $this->date);
        $this->assertEquals(5000.00, $result['ftd']['full']['ip']);
        $this->assertEquals(0.00,    $result['ftd']['partial']['ip']);
    }

    // ─── getRefundData ───────────────────────────────────────────────────────

    public function test_refund_uses_abs_amount_of_refund_status(): void
    {
        BillItem::factory()->forBranch('chromepet')->forDate($this->date)->create([
            'patient_type' => 'OP', 'service_type' => 'Consultation',
            'amount' => -2000, 'net_amount' => -2000, 'status' => 'Refund',
        ]);

        $result = $this->repo->getRefundData(Branch::CHROMEPET, $this->date);
        $this->assertEquals(2000.00, $result['ftd']['op']);
    }

    // ─── getPackageAdjustment ────────────────────────────────────────────────

    public function test_package_adjustment_only_for_chromepet(): void
    {
        PackageConsumption::factory()->create([
            'branch' => 'oragadam', 'consumption_date' => $this->date, 'amount' => 9999,
        ]);

        $result = $this->repo->getPackageAdjustment(Branch::ORAGADAM, $this->date);
        $this->assertEquals(0.0, $result['ftd']);
        $this->assertEquals(0.0, $result['mtd']);
    }

    public function test_package_adjustment_sums_for_chromepet(): void
    {
        PackageConsumption::factory()->create([
            'branch' => 'chromepet', 'consumption_date' => $this->date, 'amount' => 3000,
        ]);
        PackageConsumption::factory()->create([
            'branch' => 'chromepet', 'consumption_date' => $this->date, 'amount' => 2000,
        ]);

        $result = $this->repo->getPackageAdjustment(Branch::CHROMEPET, $this->date);
        $this->assertEquals(5000.0, $result['ftd']);
    }

    // ─── getMriData ──────────────────────────────────────────────────────────

    public function test_mri_returns_zero_for_oragadam(): void
    {
        $result = $this->repo->getMriData(Branch::ORAGADAM, $this->date);
        $this->assertEquals(0, $result['ftd']['op']['count']);
        $this->assertEquals(0, $result['ftd']['ip']['revenue']);
    }
}
