<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mis_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->unique();
            $table->string('status', 20)->default('pending'); // pending, processing, completed, failed

            // Sales
            $table->decimal('sales_op', 14, 2)->default(0);
            $table->decimal('sales_ip', 14, 2)->default(0);
            $table->decimal('sales_er', 14, 2)->default(0);
            $table->decimal('sales_pharmacy', 14, 2)->default(0);
            $table->decimal('sales_total', 14, 2)->default(0);

            // Collection
            $table->decimal('collection_op', 14, 2)->default(0);
            $table->decimal('collection_ip', 14, 2)->default(0);
            $table->decimal('collection_er', 14, 2)->default(0);
            $table->decimal('collection_total', 14, 2)->default(0);

            // Discount
            $table->decimal('discount_99', 14, 2)->default(0);
            $table->decimal('discount_100', 14, 2)->default(0);

            // Refund
            $table->decimal('refund', 14, 2)->default(0);

            // MRI
            $table->integer('mri_op_count')->default(0);
            $table->integer('mri_ip_count')->default(0);
            $table->decimal('mri_op_revenue', 14, 2)->default(0);
            $table->decimal('mri_ip_revenue', 14, 2)->default(0);

            // OP Count
            $table->integer('total_op')->default(0);

            // Operational
            $table->integer('occupancy')->default(0);
            $table->decimal('occupancy_percent', 6, 2)->default(0);
            $table->integer('admission')->default(0);
            $table->integer('discharge')->default(0);

            // Meta
            $table->json('payload')->nullable();         // Full computed JSON
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mis_reports');
    }
};
