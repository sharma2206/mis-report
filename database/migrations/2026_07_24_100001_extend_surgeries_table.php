<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surgeries', function (Blueprint $table) {
            // Surgeon fields
            $table->string('requested_surgeon',  255)->nullable()->after('performing_surgeon');
            $table->string('scheduled_surgeon',  255)->nullable()->after('requested_surgeon');

            // Time & duration fields
            $table->string('surgery_booking_datetime', 50)->nullable()->after('ot_tat');
            $table->string('expected_surgery_date',    50)->nullable()->after('surgery_booking_datetime');
            $table->string('discharge_date',           50)->nullable()->after('expected_surgery_date');

            // LOS fields (stored as decimal hours or days)
            $table->decimal('los',          8, 2)->nullable()->after('discharge_date');
            $table->decimal('icu_los',      8, 2)->nullable()->after('los');
            $table->decimal('non_icu_los',  8, 2)->nullable()->after('icu_los');

            // Blood fields
            $table->boolean('blood_required')->nullable()->after('non_icu_los');
            $table->string('blood_group',   20)->nullable()->after('blood_required');

            // PAC & Quality
            $table->string('pac_status',            50)->nullable()->after('pac_clearance');
            $table->string('antibiotic_compliance', 50)->nullable()->after('pac_status');
            $table->string('surgical_indicators',   255)->nullable()->after('antibiotic_compliance');
            $table->text('remarks')->nullable()->after('surgical_indicators');

            // OT check-in/out TAT (integer minutes, easier to aggregate)
            $table->unsignedSmallInteger('surgery_duration_min')->nullable()->comment('surgery_end - surgery_start in minutes')->after('remarks');
            $table->unsignedSmallInteger('ot_duration_min')->nullable()->comment('ot_checkout - ot_checkin in minutes')->after('surgery_duration_min');
        });
    }

    public function down(): void
    {
        Schema::table('surgeries', function (Blueprint $table) {
            $table->dropColumn([
                'requested_surgeon', 'scheduled_surgeon',
                'surgery_booking_datetime', 'expected_surgery_date', 'discharge_date',
                'los', 'icu_los', 'non_icu_los',
                'blood_required', 'blood_group',
                'pac_status', 'antibiotic_compliance', 'surgical_indicators', 'remarks',
                'surgery_duration_min', 'ot_duration_min',
            ]);
        });
    }
};
