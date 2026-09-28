<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('package_consumptions', function (Blueprint $table) {
            $table->string('uhid')->nullable()->after('branch');
            $table->string('patient_name')->nullable()->after('uhid');
            $table->string('bill_no')->nullable()->after('patient_name');
            $table->string('patient_type')->nullable()->after('bill_no');
            $table->string('payer_type')->nullable()->after('patient_type');
            $table->string('payer_name')->nullable()->after('payer_type');
            $table->string('package_type')->nullable()->after('amount');
            $table->string('package_sub_type')->nullable()->after('package_type');
            $table->string('package_name')->nullable()->after('package_sub_type');
            $table->string('package_codes')->nullable()->after('package_name');
            $table->string('department')->nullable()->after('package_codes');
            $table->string('sub_department')->nullable()->after('department');
            $table->string('billing_category')->nullable()->after('sub_department');
            $table->string('package_service_type')->nullable()->after('billing_category');
            $table->text('package_service_item')->nullable()->after('package_service_type');
            $table->decimal('service_item_amount', 10, 2)->nullable()->after('package_service_item');
            $table->string('order_by')->nullable()->after('service_item_amount');

            $table->index(['branch', 'consumption_date'], 'idx_pc_branch_date');
        });
    }

    public function down(): void
    {
        Schema::table('package_consumptions', function (Blueprint $table) {
            $table->dropIndex('idx_pc_branch_date');
            $table->dropColumn([
                'uhid', 'patient_name', 'bill_no', 'patient_type', 'payer_type', 'payer_name',
                'package_type', 'package_sub_type', 'package_name', 'package_codes',
                'department', 'sub_department', 'billing_category',
                'package_service_type', 'package_service_item', 'service_item_amount', 'order_by',
            ]);
        });
    }
};
