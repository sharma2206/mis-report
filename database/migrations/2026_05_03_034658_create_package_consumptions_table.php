<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('package_consumptions', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->index();
            $table->string('package_name')->nullable();
            $table->string('patient_id')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('patient_type', 20)->nullable();
            $table->string('service_type')->nullable()->index(); // Pharmacy
            $table->string('item_name')->nullable();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('rate', 12, 2)->default(0);
            $table->decimal('value', 12, 2)->default(0);          // Consumed value
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->index(['report_date', 'service_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_consumptions');
    }
};
