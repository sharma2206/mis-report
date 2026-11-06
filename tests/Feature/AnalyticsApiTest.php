<?php

namespace Tests\Feature;

use App\Models\IpAdmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admissions_analytics_endpoint_queries_treating_department_without_sql_errors(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'branch' => 'chromepet']);

        IpAdmission::create([
            'tenant_id'           => 1,
            'branch'              => 'chromepet',
            'admission_no'        => 'ADM001',
            'uhid'                => 'UHID001',
            'patient_name'        => 'John Doe',
            'admission_date'      => '2026-11-01',
            'treating_department' => 'Cardiology',
            'gender'              => 'Male',
            'age'                 => 45,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/analytics/admissions?branch=chromepet&from=2026-10-31&to=2026-11-06');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.by_dept.0.department', 'Cardiology')
            ->assertJsonPath('data.by_dept.0.count', 1);
    }

    public function test_ip_demographics_analytics_endpoint_calculates_age_brackets(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'branch' => 'chromepet']);

        IpAdmission::create([
            'tenant_id'           => 1,
            'branch'              => 'chromepet',
            'admission_no'        => 'ADM002',
            'uhid'                => 'UHID002',
            'patient_name'        => 'Jane Doe',
            'admission_date'      => '2026-11-02',
            'treating_department' => 'Orthopaedics',
            'gender'              => 'Female',
            'age'                 => 25,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/analytics/ip-demographics?branch=chromepet&from=2026-10-31&to=2026-11-06');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1);
    }
}

