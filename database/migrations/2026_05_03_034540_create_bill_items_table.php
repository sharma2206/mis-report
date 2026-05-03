<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bill_items', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->index();
            $table->string('bill_no')->nullable()->index();
            $table->string('patient_id')->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->string('patient_type', 20)->nullable()->index(); // OP, IP, ER
            $table->string('service_type')->nullable()->index();    // Pharmacy, OP Consultation, etc.
            $table->string('sub_department')->nullable()->index();  // MRI, CT, etc.
            $table->string('item_name')->nullable();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('rate', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);          // Gross amount
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);      // Final billable
            $table->string('status', 30)->nullable()->index();     // Active, Refund
            $table->string('doctor_name')->nullable();
            $table->json('raw_data')->nullable();                  // Backup of full row
            $table->timestamps();

            $table->index(['report_date', 'patient_type']);
            $table->index(['report_date', 'service_type']);
            $table->index(['report_date', 'sub_department']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_items');
    }
};
