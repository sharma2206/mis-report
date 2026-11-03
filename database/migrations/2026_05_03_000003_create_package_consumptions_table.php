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
        Schema::create('package_consumptions', function (Blueprint $table) {
            $table->id();
            $table->string('branch');
            $table->date('consumption_date');
            $table->decimal('amount', 10, 2);

            // Snapshot fields (kept denormalized for import compatibility)
            $table->string('uhid')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('bill_no')->nullable();
            $table->string('patient_type')->nullable();
            $table->string('payer_type')->nullable();
            $table->string('payer_name')->nullable();

            // Package details
            $table->string('package_type')->nullable();
            $table->string('package_sub_type')->nullable();
            $table->string('package_name')->nullable();
            $table->string('package_codes')->nullable();
            $table->string('department')->nullable();
            $table->string('sub_department')->nullable();
            $table->string('billing_category')->nullable();
            $table->string('package_service_type')->nullable();
            $table->text('package_service_item')->nullable();
            $table->decimal('service_item_amount', 10, 2)->nullable();
            $table->string('order_by')->nullable();

            $table->timestamps();
            $table->softDeletes();
            $table->index(['branch', 'consumption_date'], 'idx_pc_branch_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('package_consumptions');
    }
};
