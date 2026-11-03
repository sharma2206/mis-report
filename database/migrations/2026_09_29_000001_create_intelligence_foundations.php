<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('source_capabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('source_key', 80);
            $table->string('adapter', 120)->nullable();
            $table->string('status', 30)->default('not_connected');
            $table->timestamp('last_synced_at')->nullable();
            $table->json('capabilities')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'source_key']);
        });

        Schema::create('data_quality_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('branch')->nullable();
            $table->date('from_date')->nullable();
            $table->date('to_date')->nullable();
            $table->json('counts');
            $table->timestamp('scanned_at');
            $table->timestamps();
            $table->index(['tenant_id', 'branch', 'scanned_at'], 'dq_tenant_branch_scanned');
        });

        Schema::table('bill_items', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'bill_date'], 'bi_tenant_branch_date'));
        Schema::table('cashier_collections', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'collection_date'], 'cc_tenant_branch_date'));
        Schema::table('ip_admissions', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'admission_date'], 'ip_tenant_branch_date'));
        Schema::table('er_admissions', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'admission_date'], 'er_tenant_branch_date'));
        Schema::table('surgeries', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'surgery_date'], 'surg_tenant_branch_date'));
        Schema::table('package_consumptions', fn (Blueprint $table) =>
            $table->index(['tenant_id', 'branch', 'consumption_date'], 'pkg_tenant_branch_date'));
    }

    public function down(): void
    {
        Schema::table('bill_items', fn (Blueprint $table) => $table->dropIndex('bi_tenant_branch_date'));
        Schema::table('cashier_collections', fn (Blueprint $table) => $table->dropIndex('cc_tenant_branch_date'));
        Schema::table('ip_admissions', fn (Blueprint $table) => $table->dropIndex('ip_tenant_branch_date'));
        Schema::table('er_admissions', fn (Blueprint $table) => $table->dropIndex('er_tenant_branch_date'));
        Schema::table('surgeries', fn (Blueprint $table) => $table->dropIndex('surg_tenant_branch_date'));
        Schema::table('package_consumptions', fn (Blueprint $table) => $table->dropIndex('pkg_tenant_branch_date'));
        Schema::dropIfExists('data_quality_snapshots');
        Schema::dropIfExists('source_capabilities');
    }
};
