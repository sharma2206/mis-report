<?php

namespace Tests\Feature;

use App\Models\BillItem;
use App\Models\KpiDefinition;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KpiEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_lists_the_seeded_revenue_kpi(): void
    {
        $admin = User::factory()->admin()->create();

        $codes = collect(
            $this->actingAs($admin)->getJson('/api/v1/kpis')->assertOk()->json('data')
        )->pluck('code');

        $this->assertTrue($codes->contains('NET_REVENUE'));
        $this->assertTrue($codes->contains('OCCUPANCY'));
    }

    public function test_net_revenue_uses_the_existing_bill_calculation(): void
    {
        $admin = User::factory()->admin()->create();
        $date = '2026-06-15';

        BillItem::factory()->forBranch('chromepet')->forDate($date)->create([
            'net_amount' => 2500,
            'status' => 'Sale',
            'patient_type' => 'OP',
        ]);
        BillItem::factory()->forBranch('chromepet')->forDate($date)->create([
            'net_amount' => 500,
            'status' => 'Refund',
            'patient_type' => 'OP',
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/kpis/NET_REVENUE?branch=chromepet&from={$date}")
            ->assertOk()
            ->assertJsonPath('data.code', 'NET_REVENUE')
            ->assertJsonPath('data.value', 2500);
    }

    public function test_another_tenant_does_not_see_the_default_catalog(): void
    {
        $other = Tenant::create([
            'name' => 'Other Hospital Group',
            'slug' => 'other-kpi',
            'is_active' => true,
        ]);
        $user = User::factory()->admin()->create(['tenant_id' => $other->id]);

        $this->actingAs($user)
            ->getJson('/api/v1/kpis')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->assertTrue(KpiDefinition::withoutGlobalScope('tenant')->where('code', 'NET_REVENUE')->exists());
    }
}
