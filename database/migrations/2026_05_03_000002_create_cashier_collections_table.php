<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cashier_collections', function (Blueprint $table) {

            // Primary Key
            $table->id();

            // Branch & Collection
            $table->string('branch', 100)->index();
            $table->date('collection_date')->index();

            // Receipt / Transaction
            $table->string('receipt_no', 50)->nullable()->index();
            $table->string('transaction_type', 50)->nullable();
            $table->string('transaction_category', 100)->nullable();

            // Patient Information
            $table->string('uhid', 50)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->string('visit_id', 50)->nullable()->index();
            $table->string('patient_type', 50)->nullable();

            // Payer Information
            $table->string('payer_type', 50)->nullable();
            $table->string('payer_name')->nullable();

            // Department / Collection User
            $table->string('user_department', 100)->nullable();

            // Payment
            $table->string('payment_mode', 50)->nullable();
            $table->decimal('paid_amount', 12, 2)->default(0);

            // Timestamps
            $table->timestamps();

            // Soft deletes for imports/cleanup
            $table->softDeletes();


            // ============================================
            // ANALYTICS INDEXES
            // ============================================

            $table->index(
                ['branch', 'collection_date', 'patient_type'],
                'idx_cc_branch_date_ptype'
            );

            $table->index(
                ['branch', 'collection_date', 'payer_type'],
                'idx_cc_branch_date_payertype'
            );

            $table->index(
                ['branch', 'collection_date', 'payment_mode'],
                'idx_cc_branch_date_payment'
            );

            $table->index(
                ['branch', 'collection_date', 'transaction_type'],
                'idx_cc_branch_date_transtype'
            );

            $table->index(
                ['branch', 'collection_date', 'transaction_category'],
                'idx_cc_branch_date_category'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_collections');
    }
};
