<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Adds composite indexes that speed up the core MIS aggregation queries.
// MisRepository aggregates bill_items by (branch, bill_date, service_type/patient_type/status),
// causing full-table scans on the single-column indexes that existed before.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bill_items', function (Blueprint $table) {
            $table->index(['branch', 'bill_date', 'service_type'], 'idx_bill_items_branch_date_stype');
            $table->index(['branch', 'bill_date', 'patient_type'], 'idx_bill_items_branch_date_ptype');
            $table->index(['branch', 'bill_date', 'status'],       'idx_bill_items_branch_date_status');
        });

        Schema::table('cashier_collections', function (Blueprint $table) {
            $table->index(['branch', 'collection_date'], 'idx_cashier_branch_date');
        });
    }

    public function down(): void
    {
        Schema::table('bill_items', function (Blueprint $table) {
            $table->dropIndex('idx_bill_items_branch_date_stype');
            $table->dropIndex('idx_bill_items_branch_date_ptype');
            $table->dropIndex('idx_bill_items_branch_date_status');
        });

        Schema::table('cashier_collections', function (Blueprint $table) {
            $table->dropIndex('idx_cashier_branch_date');
        });
    }
};
