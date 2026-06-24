<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surgeries', function (Blueprint $table) {
            $table->id();
            $table->string('branch')->index();
            $table->date('surgery_date')->index();
            $table->string('admission_no')->nullable();
            $table->string('uhid')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('age')->nullable();
            $table->string('gender')->nullable();
            $table->string('patient_type')->nullable();
            $table->string('surgery_name')->nullable();
            $table->string('surgery_code')->nullable();
            $table->string('surgery_category')->nullable();  // Major / Minor
            $table->string('surgery_type')->nullable();      // ot / cathlab
            $table->string('surgery_department')->nullable();
            $table->string('surgery_sub_department')->nullable();
            $table->string('ot_name')->nullable();
            $table->string('ot_surgery_type')->nullable();   // Elective / Emergency
            $table->string('performing_surgeon')->nullable();
            $table->string('component_doctor')->nullable();
            $table->string('surgeon_speciality')->nullable();
            $table->string('surgeon_department')->nullable();
            $table->string('anaesthesia_type')->nullable();
            $table->string('payer_type')->nullable();
            $table->string('payer_name')->nullable();
            $table->string('payer_group')->nullable();
            $table->string('billing_category')->nullable();
            $table->string('status')->nullable();
            $table->string('diagnosis_name')->nullable();
            $table->boolean('implant_required')->default(false);
            $table->string('surgery_contamination')->nullable();
            $table->boolean('pac_clearance')->default(false);
            $table->dateTime('surgery_start')->nullable();
            $table->dateTime('surgery_end')->nullable();
            $table->dateTime('ot_checkin')->nullable();
            $table->dateTime('ot_checkout')->nullable();
            $table->string('surgery_tat')->nullable();       // "215 Min"
            $table->string('ot_tat')->nullable();            // "270 Min"
            $table->timestamps();

            $table->index(['branch', 'surgery_date', 'surgery_category'], 'idx_surg_branch_date_cat');
            $table->index(['branch', 'surgery_date', 'performing_surgeon'], 'idx_surg_branch_date_surgeon');
            $table->index(['branch', 'surgery_date', 'surgery_department'], 'idx_surg_branch_date_dept');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surgeries');
    }
};
