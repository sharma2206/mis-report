<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_logs', function (Blueprint $table) {
            $table->id();
            $table->string('branch', 32)->index();
            $table->date('report_date')->index();
            $table->string('uploaded_by')->nullable();
            $table->json('files_uploaded')->nullable(); // ['bill_items', 'cashier', ...]
            $table->integer('rows_imported')->default(0);
            $table->integer('rows_skipped')->default(0);
            $table->integer('rows_errored')->default(0);
            $table->string('status', 16)->default('success'); // success | partial | failed
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_logs');
    }
};
