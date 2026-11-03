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
        Schema::create('bill_items', function (Blueprint $table) {

            // Primary Key
            $table->id();

            // Hospital / Branch
            $table->string('branch', 100)->index();

            // Bill Information
            $table->string('bill_no', 50)->nullable()->index();
            $table->date('bill_date')->index();

            // Patient Information
            $table->string('patient_id', 50)->index();
            $table->string('uhid', 50)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->string('patient_type', 50)->nullable();
            $table->string('age', 20)->nullable();
            $table->string('gender', 20)->nullable();

            // Visit / Admission Information
            $table->string('visit_id', 50)->nullable()->index();
            $table->string('ward', 100)->nullable();
            $table->string('bed', 100)->nullable();

            // Payer Information
            $table->string('payer_type', 50)->nullable();
            $table->string('payer_name')->nullable();
            $table->string('payer_group')->nullable();
            $table->string('insurance_company')->nullable();
            $table->string('corporate_name')->nullable();

            // Doctor / Clinical Information
            $table->string('treating_doctor')->nullable();
            $table->string('treating_doctor_speciality')->nullable();
            $table->string('treating_department')->nullable();
            $table->string('treating_sub_department')->nullable();

            // Service Information
            $table->string('service_type', 100);
            $table->string('billing_category')->nullable();
            $table->string('sub_department')->nullable();
            $table->string('service_item_code')->nullable()->index();
            $table->text('service_item_name')->nullable();

            // Financial Information
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);
            $table->unsignedInteger('quantity')->default(1);

            // Payment
            $table->string('payment_mode', 50)->nullable();

            // Record Status
            $table->string('status', 30)->default('Active')->index();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();


            // ============================================
            // ANALYTICS INDEXES
            // ============================================

            $table->index(
                ['branch', 'bill_date', 'patient_type'],
                'idx_bi_branch_date_ptype'
            );

            $table->index(
                ['branch', 'bill_date', 'payer_type'],
                'idx_bi_branch_date_payertype'
            );

            $table->index(
                ['branch', 'bill_date', 'treating_department'],
                'idx_bi_branch_date_dept'
            );

            $table->index(
                ['branch', 'bill_date', 'status'],
                'idx_bi_branch_date_status'
            );

            $table->index(
                ['branch', 'bill_date', 'service_type'],
                'idx_bi_branch_date_service'
            );

            $table->index(
                ['branch', 'bill_date', 'billing_category'],
                'idx_bi_branch_date_category'
            );

            // Index to speed up unique patient counts and uh id lookups by date
            $table->index(
                ['branch', 'bill_date', 'uhid'],
                'idx_bi_branch_date_uhid'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bill_items');
    }
};
