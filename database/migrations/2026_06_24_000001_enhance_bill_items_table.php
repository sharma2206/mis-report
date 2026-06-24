<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bill_items', function (Blueprint $table) {
            $table->string('bill_no')->nullable()->after('branch');
            $table->string('uhid')->nullable()->after('bill_no');
            $table->string('patient_name')->nullable()->after('patient_id');
            $table->string('age')->nullable()->after('patient_name');
            $table->string('gender')->nullable()->after('age');
            $table->string('ward')->nullable()->after('gender');
            $table->string('bed')->nullable()->after('ward');
            $table->string('visit_id')->nullable()->after('bed');
            $table->string('payer_type')->nullable()->after('patient_type');
            $table->string('payer_name')->nullable()->after('payer_type');
            $table->string('payer_group')->nullable()->after('payer_name');
            $table->string('insurance_company')->nullable()->after('payer_group');
            $table->string('corporate_name')->nullable()->after('insurance_company');
            $table->string('treating_doctor')->nullable()->after('service_type');
            $table->string('treating_doctor_speciality')->nullable()->after('treating_doctor');
            $table->string('treating_department')->nullable()->after('treating_doctor_speciality');
            $table->string('treating_sub_department')->nullable()->after('treating_department');
            $table->string('billing_category')->nullable()->after('treating_sub_department');
            $table->string('service_item_code')->nullable()->after('sub_department');
            $table->text('service_item_name')->nullable()->after('service_item_code');
            $table->decimal('discount_amount', 10, 2)->nullable()->after('amount');
            $table->string('payment_mode')->nullable()->after('net_amount');

            // Composite indexes for analytics queries
            $table->index(['branch', 'bill_date', 'patient_type'], 'idx_bi_branch_date_ptype');
            $table->index(['branch', 'bill_date', 'payer_type'], 'idx_bi_branch_date_payertype');
            $table->index(['branch', 'bill_date', 'treating_department'], 'idx_bi_branch_date_dept');
            $table->index(['branch', 'bill_date', 'status'], 'idx_bi_branch_date_status');
        });
    }

    public function down(): void
    {
        Schema::table('bill_items', function (Blueprint $table) {
            $table->dropIndex('idx_bi_branch_date_ptype');
            $table->dropIndex('idx_bi_branch_date_payertype');
            $table->dropIndex('idx_bi_branch_date_dept');
            $table->dropIndex('idx_bi_branch_date_status');
            $table->dropColumn([
                'bill_no', 'uhid', 'patient_name', 'age', 'gender', 'ward', 'bed', 'visit_id',
                'payer_type', 'payer_name', 'payer_group', 'insurance_company', 'corporate_name',
                'treating_doctor', 'treating_doctor_speciality', 'treating_department', 'treating_sub_department',
                'billing_category', 'service_item_code', 'service_item_name', 'discount_amount', 'payment_mode',
            ]);
        });
    }
};
