<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpi_definitions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('code', 64);
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('source', 32);
            $table->string('calculator', 64);
            $table->string('format', 16)->default('number');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
        });

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('kpi_definitions', function (Blueprint $table) {
                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            });
        }

        $tenantId = DB::table('tenants')->where('slug', 'default')->value('id');
        if (! $tenantId) {
            return;
        }

        $now = now();
        $rows = [
            ['NET_REVENUE', 'Net Revenue', 'Sale net amount from bill items', 'bill', 'revenue', 'currency', 10],
            ['PHARMACY_REVENUE', 'Pharmacy Revenue', 'Pharmacy service net amount', 'bill', 'pharmacy_revenue', 'currency', 20],
            ['CASH_COLLECTION', 'Cash Collection', 'Cashier paid amount', 'cashier', 'cash_collection', 'currency', 30],
            ['PACKAGE_REVENUE', 'Package Revenue', 'Package consumption amount', 'package', 'package_revenue', 'currency', 40],
            ['OP_COUNT', 'OP Visits', 'Distinct OP patients', 'bill', 'op_count', 'number', 50],
            ['IP_ADMISSIONS', 'IP Admissions', 'Inpatient admissions', 'ip', 'ip_count', 'number', 60],
            ['DISCHARGES', 'Discharges', 'Inpatient discharges', 'ip', 'discharges', 'number', 70],
            ['ER_COUNT', 'ER Visits', 'Emergency visits', 'er', 'er_count', 'number', 80],
            ['BEDS_OCCUPIED', 'Beds Occupied', 'Patients still admitted on the date', 'ip', 'beds_occupied', 'number', 90],
            ['OCCUPANCY', 'Occupancy %', 'Occupied beds divided by branch bed count', 'ip', 'occupancy', 'percent', 100],
        ];

        DB::table('kpi_definitions')->insert(array_map(fn ($row) => [
            'tenant_id'   => $tenantId,
            'code'        => $row[0],
            'name'        => $row[1],
            'description' => $row[2],
            'source'      => $row[3],
            'calculator'  => $row[4],
            'format'      => $row[5],
            'sort_order'  => $row[6],
            'is_active'   => true,
            'created_at'  => $now,
            'updated_at'  => $now,
        ], $rows));
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_definitions');
    }
};
