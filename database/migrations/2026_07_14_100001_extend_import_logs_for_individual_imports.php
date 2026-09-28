<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            // null = batch import; set to typeKey ('bill_items','cashier',…) for individual
            $table->string('report_type', 32)->nullable()->after('branch');
            // Detected CSV period for this upload
            $table->date('period_from')->nullable()->after('rows_errored');
            $table->date('period_to')->nullable()->after('period_from');
            // How long the import took in milliseconds
            $table->integer('duration_ms')->nullable()->after('period_to');
        });
    }

    public function down(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            $table->dropColumn(['report_type', 'period_from', 'period_to', 'duration_ms']);
        });
    }
};
