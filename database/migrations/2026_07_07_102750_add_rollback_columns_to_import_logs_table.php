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
        Schema::table('import_logs', function (Blueprint $table) {
            $table->timestamp('rolled_back_at')->nullable()->after('notes');
            $table->string('rolled_back_by')->nullable()->after('rolled_back_at');
        });
    }

    public function down(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            $table->dropColumn(['rolled_back_at', 'rolled_back_by']);
        });
    }
};
