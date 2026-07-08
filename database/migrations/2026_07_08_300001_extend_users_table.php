<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id', 50)->unique()->nullable()->after('id');
            $table->string('employee_code', 50)->nullable()->after('employee_id');
            $table->string('mobile', 20)->nullable()->after('email');
            $table->string('designation', 100)->nullable()->after('branch');
            $table->string('department', 100)->nullable()->after('designation');
            $table->string('speciality', 100)->nullable()->after('department');
            $table->foreignId('reporting_manager_id')
                ->nullable()->constrained('users')->nullOnDelete()->after('speciality');
            $table->date('date_of_joining')->nullable()->after('reporting_manager_id');
            $table->enum('employment_status', ['active', 'on_leave', 'resigned', 'terminated', 'probation'])
                ->default('active')->after('date_of_joining');
            $table->unsignedTinyInteger('failed_login_attempts')->default(0)->after('employment_status');
            $table->timestamp('locked_at')->nullable()->after('failed_login_attempts');
            $table->timestamp('last_login_at')->nullable()->after('locked_at');
            $table->timestamp('last_logout_at')->nullable()->after('last_login_at');
            $table->timestamp('password_changed_at')->nullable()->after('last_logout_at');
            $table->timestamp('password_expires_at')->nullable()->after('password_changed_at');
            $table->boolean('mfa_enabled')->default(false)->after('password_expires_at');
            $table->string('mfa_secret', 255)->nullable()->after('mfa_enabled');
            $table->string('avatar', 500)->nullable()->after('mfa_secret');

            $table->index('department');
            $table->index('employment_status');
            $table->index('locked_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['reporting_manager_id']);
            $table->dropColumn([
                'employee_id', 'employee_code', 'mobile', 'designation', 'department',
                'speciality', 'reporting_manager_id', 'date_of_joining', 'employment_status',
                'failed_login_attempts', 'locked_at', 'last_login_at', 'last_logout_at',
                'password_changed_at', 'password_expires_at', 'mfa_enabled', 'mfa_secret', 'avatar',
            ]);
        });
    }
};
