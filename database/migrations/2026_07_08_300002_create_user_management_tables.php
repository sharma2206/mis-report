<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->string('display_name', 100)->nullable();
            $table->string('emergency_contact_name', 100)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->text('bio')->nullable();
            $table->text('notes')->nullable();
            $table->string('timezone', 50)->default('Asia/Kolkata');
            $table->timestamps();
        });

        Schema::create('user_branches', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('branch', 50);
            $table->primary(['user_id', 'branch']);
        });

        Schema::create('user_departments', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('department', 100);
            $table->primary(['user_id', 'department']);
        });

        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('event', ['login', 'logout', 'failed_login', 'locked', 'unlocked', 'password_reset', 'force_logout']);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('location', 200)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'event']);
            $table->index('created_at');
        });

        Schema::create('password_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('password_hash');
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_history');
        Schema::dropIfExists('login_logs');
        Schema::dropIfExists('user_departments');
        Schema::dropIfExists('user_branches');
        Schema::dropIfExists('user_profiles');
    }
};
