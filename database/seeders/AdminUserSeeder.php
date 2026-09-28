<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@mis.local'],
            [
                'name'     => 'Admin',
                'password' => 'Admin@123',   // hashed by $casts
                'role'     => 'admin',
                'branch'   => null,
                'is_active'=> true,
            ]
        );

        // Branch-specific managers
        foreach (['chromepet', 'oragadam'] as $branch) {
            User::firstOrCreate(
                ['email' => "{$branch}@mis.local"],
                [
                    'name'      => ucfirst($branch) . ' Manager',
                    'password'  => 'Manager@123',
                    'role'      => 'manager',
                    'branch'    => $branch,
                    'is_active' => true,
                ]
            );
        }
    }
}
