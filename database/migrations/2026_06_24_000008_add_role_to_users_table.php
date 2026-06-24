<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('viewer')->after('email'); // admin | manager | viewer
            $table->string('branch')->nullable()->after('role');       // null = all branches
            $table->boolean('is_active')->default(true)->after('branch');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'branch', 'is_active']);
        });
    }
};
