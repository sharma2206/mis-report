<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('er_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('branch')->index();
            $table->date('admission_date')->index();
            $table->string('admission_no')->nullable();
            $table->string('uhid')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('age')->nullable();
            $table->string('gender')->nullable();
            $table->string('admission_type')->nullable();
            $table->string('status')->nullable();
            $table->string('doctor_name')->nullable();
            $table->string('doctor_speciality')->nullable();
            $table->string('treating_department')->nullable();
            $table->string('ward')->nullable();
            $table->string('bed')->nullable();
            $table->string('payer_type')->nullable();
            $table->string('payer_name')->nullable();
            $table->string('payer_group')->nullable();
            $table->string('billing_category')->nullable();
            $table->boolean('high_risk')->default(false);
            $table->boolean('mlc')->default(false);
            $table->boolean('short_stay')->default(false);
            $table->string('discharge_type')->nullable();
            $table->dateTime('discharge_date')->nullable();
            $table->decimal('actual_los', 8, 2)->nullable();
            $table->timestamps();

            $table->index(['branch', 'admission_date', 'payer_type'], 'idx_er_branch_date_ptype');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('er_admissions');
    }
};
