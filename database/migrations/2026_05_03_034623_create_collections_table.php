<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->index();
            $table->string('receipt_no')->nullable()->index();
            $table->string('bill_no')->nullable()->index();
            $table->string('patient_id')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('patient_type', 20)->nullable()->index(); // OP, IP, ER
            $table->string('payment_mode')->nullable();              // Cash, Card, UPI
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->string('cashier_name')->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->index(['report_date', 'patient_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
