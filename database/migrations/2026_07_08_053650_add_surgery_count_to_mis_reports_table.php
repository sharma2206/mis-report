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
        Schema::table('mis_reports', function (Blueprint $table) {
            $table->integer('surgery_count')->default(0)->after('er_count');
        });
    }

    public function down(): void
    {
        Schema::table('mis_reports', function (Blueprint $table) {
            $table->dropColumn('surgery_count');
        });
    }
};
