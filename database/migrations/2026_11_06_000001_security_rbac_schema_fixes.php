<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds:
 * 1. employee_code column to users (was in fillable but missing from schema).
 * 2. 'branch.global_access' system permission required for unrestricted branch access.
 * 3. tenant_id to roles table (tenant-scoped roles support).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Add employee_code to users if missing.
        if (!Schema::hasColumn('users', 'employee_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('employee_code', 50)->nullable()->after('employee_id');
                $table->index('employee_code');
            });
        }

        // 2. Add tenant_id to roles table (nullable for backward-compat; NULL = global/system role).
        if (!Schema::hasColumn('roles', 'tenant_id')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->unsignedBigInteger('tenant_id')->nullable()->after('id')->index();
            });

            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                Schema::table('roles', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
                });
            }
        }

        // 3. Guard name column on permissions (referenced in fillable but missing from schema).
        if (!Schema::hasColumn('permissions', 'guard_name')) {
            Schema::table('permissions', function (Blueprint $table) {
                $table->string('guard_name', 50)->default('web')->after('slug');
            });
        }

        // 4. Seed the 'branch.global_access' system permission.
        $this->seedGlobalBranchPermission();
    }

    public function down(): void
    {
        // Remove the seeded permission.
        $perm = DB::table('permissions')->where('slug', 'branch.global_access')->first();
        if ($perm) {
            DB::table('role_permissions')->where('permission_id', $perm->id)->delete();
            DB::table('permissions')->where('id', $perm->id)->delete();
        }

        if (Schema::hasColumn('permissions', 'guard_name')) {
            Schema::table('permissions', function (Blueprint $table) {
                $table->dropColumn('guard_name');
            });
        }

        if (Schema::hasColumn('roles', 'tenant_id')) {
            Schema::table('roles', function (Blueprint $table) {
                if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                    $table->dropForeign(['tenant_id']);
                }
                $table->dropColumn('tenant_id');
            });
        }

        if (Schema::hasColumn('users', 'employee_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex(['employee_code']);
                $table->dropColumn('employee_code');
            });
        }
    }

    private function seedGlobalBranchPermission(): void
    {
        $now = now();

        // Find or create the 'Administration' permission group.
        $groupId = DB::table('permission_groups')
            ->where('slug', 'administration')
            ->value('id');

        if (!$groupId) {
            $groupId = DB::table('permission_groups')->insertGetId([
                'name'       => 'Administration',
                'slug'       => 'administration',
                'description' => 'System and tenant administration permissions',
                'icon'       => 'shield',
                'sort_order' => 99,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Insert the permission only if it does not already exist.
        if (!DB::table('permissions')->where('slug', 'branch.global_access')->exists()) {
            DB::table('permissions')->insert([
                'group_id'    => $groupId,
                'module'      => 'branch',
                'action'      => 'global_access',
                'slug'        => 'branch.global_access',
                'name'        => 'Global Branch Access',
                'description' => 'Grants unrestricted access to all branches for this tenant. Must be assigned deliberately.',
                'sort_order'  => 1,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }

        if (!DB::table('permissions')->where('slug', 'system.admin')->exists()) {
            DB::table('permissions')->insert([
                'group_id'    => $groupId,
                'module'      => 'system',
                'action'      => 'admin',
                'slug'        => 'system.admin',
                'name'        => 'System Administrator',
                'description' => 'Grants full system-level administrative access. Protected — assign with extreme caution.',
                'sort_order'  => 0,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }
};

