<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add composite indexes that include deleted_at so the DB engine can
 * efficiently satisfy soft-delete + range queries without full-table scans.
 *
 * Also adds a lookup index on import_logs for the importStatus endpoint.
 */
return new class extends Migration
{
    public function up(): void
    {
        // bill_items: soft-delete scoped queries (branch + bill_date + deleted_at)
        Schema::table('bill_items', function (Blueprint $table) {
            $table->index(['branch', 'bill_date', 'deleted_at'], 'idx_bill_branch_date_soft');
        });

        // cashier_collections
        Schema::table('cashier_collections', function (Blueprint $table) {
            $table->index(['branch', 'collection_date', 'deleted_at'], 'idx_cashier_branch_date_soft');
        });

        // er_admissions
        Schema::table('er_admissions', function (Blueprint $table) {
            $table->index(['branch', 'admission_date', 'deleted_at'], 'idx_er_branch_date_soft');
        });

        // ip_admissions
        Schema::table('ip_admissions', function (Blueprint $table) {
            $table->index(['branch', 'admission_date', 'deleted_at'], 'idx_ip_branch_date_soft');
        });

        // surgeries
        Schema::table('surgeries', function (Blueprint $table) {
            $table->index(['branch', 'surgery_date', 'deleted_at'], 'idx_surg_branch_date_soft');
        });

        // package_consumptions (Chromepet only, but index globally)
        Schema::table('package_consumptions', function (Blueprint $table) {
            $table->index(['branch', 'consumption_date', 'deleted_at'], 'idx_pkg_branch_date_soft');
        });

        // import_logs: speed up importStatus + import history page
        Schema::table('import_logs', function (Blueprint $table) {
            $table->index(['branch', 'report_type', 'report_date'], 'idx_import_logs_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('bill_items',            fn($t) => $t->dropIndex('idx_bill_branch_date_soft'));
        Schema::table('cashier_collections',   fn($t) => $t->dropIndex('idx_cashier_branch_date_soft'));
        Schema::table('er_admissions',         fn($t) => $t->dropIndex('idx_er_branch_date_soft'));
        Schema::table('ip_admissions',         fn($t) => $t->dropIndex('idx_ip_branch_date_soft'));
        Schema::table('surgeries',             fn($t) => $t->dropIndex('idx_surg_branch_date_soft'));
        Schema::table('package_consumptions',  fn($t) => $t->dropIndex('idx_pkg_branch_date_soft'));
        Schema::table('import_logs',           fn($t) => $t->dropIndex('idx_import_logs_lookup'));
    }
};
