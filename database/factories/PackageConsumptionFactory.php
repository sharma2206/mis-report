<?php

namespace Database\Factories;

use App\Models\PackageConsumption;
use Illuminate\Database\Eloquent\Factories\Factory;

class PackageConsumptionFactory extends Factory
{
    protected $model = PackageConsumption::class;

    public function definition(): array
    {
        return [
            'branch'           => $this->faker->randomElement(['chromepet', 'oragadam']),
            'consumption_date' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'amount'           => $this->faker->randomFloat(2, 500, 20000),
            'uhid'             => 'UH' . $this->faker->numberBetween(1000, 9999),
            'patient_name'     => $this->faker->name(),
            'package_type'     => $this->faker->randomElement(['Surgery', 'Delivery', 'ICU']),
            'package_name'     => $this->faker->sentence(3),
            'patient_type'     => 'IP',
            'payer_type'       => $this->faker->randomElement(['Self', 'Insurance', 'Corporate']),
        ];
    }
}
