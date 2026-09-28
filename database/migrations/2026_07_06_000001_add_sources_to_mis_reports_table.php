<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tracks which CSV source files were provided for a branch+report_date so
// DashboardKpiService can tell "zero because uploaded" apart from
// "unknown because that optional report was never uploaded".
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mis_reports', function (Blueprint $table) {
            $table->json('sources')->nullable()->after('er_count');
        });
    }

    public function down(): void
    {
        Schema::table('mis_reports', function (Blueprint $table) {
            $table->dropColumn('sources');
        });
    }
};
