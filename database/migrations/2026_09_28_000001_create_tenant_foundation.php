<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Operational tables that already store a branch string.
     * Existing rows receive the default tenant via the column default.
     */
    private array $branchTables = [
        'users',
        'bill_items',
        'cashier_collections',
        'package_consumptions',
        'er_admissions',
        'ip_admissions',
        'surgeries',
        'mis_reports',
        'import_logs',
        'audit_logs',
    ];

    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('timezone')->default('Asia/Kolkata');
            $table->string('currency', 8)->default('INR');
            $table->string('date_format', 20)->default('d-m-Y');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hospitals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('timezone')->nullable();
            $table->string('currency', 8)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('key', 50);
            $table->string('name');
            $table->unsignedInteger('bed_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });

        $now = now();
        $tenantId = DB::table('tenants')->insertGetId([
            'name'        => 'Default Hospital Group',
            'slug'        => 'default',
            'timezone'    => 'Asia/Kolkata',
            'currency'    => 'INR',
            'date_format' => 'd-m-Y',
            'is_active'   => true,
            'created_at'  => $now,
            'updated_at'  => $now,
        ]);

        $hospitalId = DB::table('hospitals')->insertGetId([
            'tenant_id'  => $tenantId,
            'name'       => 'Default Hospital',
            'slug'       => 'default',
            'timezone'   => 'Asia/Kolkata',
            'currency'   => 'INR',
            'is_active'  => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('branches')->insert([
            [
                'tenant_id'   => $tenantId,
                'hospital_id' => $hospitalId,
                'key'         => 'chromepet',
                'name'        => 'Chromepet',
                'bed_count'   => 75,
                'is_active'   => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'tenant_id'   => $tenantId,
                'hospital_id' => $hospitalId,
                'key'         => 'oragadam',
                'name'        => 'Oragadam',
                'bed_count'   => 14,
                'is_active'   => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
        ]);

        foreach ($this->branchTables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($tenantId) {
                $blueprint->unsignedBigInteger('tenant_id')->default($tenantId)->index();
            });

            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                });
            }
        }

        Schema::table('mis_reports', function (Blueprint $table) {
            $table->dropUnique(['branch', 'report_date']);
            $table->unique(['tenant_id', 'branch', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::table('mis_reports', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'branch', 'report_date']);
            $table->unique(['branch', 'report_date']);
        });

        foreach (array_reverse($this->branchTables) as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $blueprint->dropForeign(['tenant_id']);
                }
                $blueprint->dropColumn('tenant_id');
            });
        }

        Schema::dropIfExists('branches');
        Schema::dropIfExists('hospitals');
        Schema::dropIfExists('tenants');
    }
};
