<?php

namespace Database\Factories;

use App\Models\CashierCollection;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashierCollectionFactory extends Factory
{
    protected $model = CashierCollection::class;

    public function definition(): array
    {
        return [
            'branch'          => $this->faker->randomElement(['chromepet', 'oragadam']),
            'collection_date' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'patient_type'    => $this->faker->randomElement(['OP', 'IP', 'ER', null]),
            'user_department' => $this->faker->randomElement(['Billing', 'Pharmacy', 'OPD']),
            'paid_amount'     => $this->faker->randomFloat(2, 100, 50000),
            'payer_type'      => $this->faker->randomElement(['Self', 'Insurance', 'Corporate']),
            'payment_mode'    => $this->faker->randomElement(['Cash', 'UPI', 'Card', 'Cheque']),
        ];
    }

    public function forBranch(string $branch): static { return $this->state(['branch' => $branch]); }
    public function forDate(string $date): static { return $this->state(['collection_date' => $date]); }
}
