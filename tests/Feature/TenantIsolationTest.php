<?php

namespace Tests\Feature;

use App\Models\BillItem;
use App\Models\Hospital;
use App\Models\HospitalBranch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_branches_endpoint_reads_bed_counts_from_the_database(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->getJson('/api/v1/branches');

        $response->assertOk();
        $beds = collect($response->json('data'))->pluck('beds', 'key');
        $this->assertSame(75, $beds['chromepet']);
        $this->assertSame(14, $beds['oragadam']);
    }

    public function test_kpi_does_not_include_another_tenants_bills(): void
    {
        $admin = User::factory()->admin()->create();
        $date = '2026-06-15';

        BillItem::factory()->forBranch('chromepet')->forDate($date)->create([
            'net_amount' => 1000,
            'status' => 'Sale',
            'patient_type' => 'OP',
        ]);

        $other = Tenant::create([
            'name' => 'Other Hospital Group',
            'slug' => 'other',
            'is_active' => true,
        ]);

        BillItem::factory()->forBranch('chromepet')->forDate($date)->create([
            'tenant_id' => $other->id,
            'net_amount' => 9000,
            'status' => 'Sale',
            'patient_type' => 'OP',
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/analytics/kpi/chromepet/{$date}")
            ->assertOk()
            ->assertJsonPath('data.total_revenue', 1000);
    }

    public function test_user_list_hides_another_tenant(): void
    {
        $admin = User::factory()->admin()->create();
        $other = Tenant::create([
            'name' => 'Other Hospital Group',
            'slug' => 'other',
            'is_active' => true,
        ]);
        $hospital = Hospital::create([
            'tenant_id' => $other->id,
            'name' => 'Other Hospital',
            'slug' => 'other',
            'is_active' => true,
        ]);
        HospitalBranch::create([
            'tenant_id' => $other->id,
            'hospital_id' => $hospital->id,
            'key' => 'chromepet',
            'name' => 'Chromepet',
            'bed_count' => 40,
            'is_active' => true,
        ]);

        User::factory()->create([
            'tenant_id' => $other->id,
            'email' => 'other@hospital.test',
            'role' => 'admin',
        ]);

        $emails = collect(
            $this->actingAs($admin)->getJson('/api/v1/users')->assertOk()->json('data')
        )->pluck('email');

        $this->assertFalse($emails->contains('other@hospital.test'));
    }
}
