<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cashier_collections', function (Blueprint $table) {
            $table->string('uhid')->nullable()->after('branch');
            $table->string('patient_name')->nullable()->after('uhid');
            $table->string('visit_id')->nullable()->after('patient_name');
            $table->string('receipt_no')->nullable()->after('visit_id');
            $table->string('transaction_type')->nullable()->after('patient_type');
            $table->string('transaction_category')->nullable()->after('transaction_type');
            $table->string('payment_mode')->nullable()->after('paid_amount');
            $table->string('payer_type')->nullable()->after('payment_mode');
            $table->string('payer_name')->nullable()->after('payer_type');

            $table->index(['branch', 'collection_date', 'patient_type'], 'idx_cc_branch_date_ptype');
            $table->index(['branch', 'collection_date', 'payer_type'], 'idx_cc_branch_date_payertype');
        });
    }

    public function down(): void
    {
        Schema::table('cashier_collections', function (Blueprint $table) {
            $table->dropIndex('idx_cc_branch_date_ptype');
            $table->dropIndex('idx_cc_branch_date_payertype');
            $table->dropColumn([
                'uhid', 'patient_name', 'visit_id', 'receipt_no',
                'transaction_type', 'transaction_category',
                'payment_mode', 'payer_type', 'payer_name',
            ]);
        });
    }
};
