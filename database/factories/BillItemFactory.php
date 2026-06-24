<?php

namespace Database\Factories;

use App\Models\BillItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class BillItemFactory extends Factory
{
    protected $model = BillItem::class;

    public function definition(): array
    {
        $amount    = $this->faker->randomFloat(2, 100, 50000);
        $discount  = $this->faker->optional(.3)->randomFloat(2, 0, $amount * .5) ?? 0;
        $netAmount = round($amount - $discount, 2);

        return [
            'branch'       => $this->faker->randomElement(['chromepet', 'oragadam']),
            'bill_date'    => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'bill_no'      => 'BL' . $this->faker->unique()->numberBetween(10000, 99999),
            'uhid'         => 'UH' . $this->faker->numberBetween(1000, 9999),
            'patient_id'   => 'UH' . $this->faker->numberBetween(1000, 9999),
            'patient_name' => $this->faker->name(),
            'patient_type' => $this->faker->randomElement(['OP', 'IP', 'ER', null]),
            'service_type' => $this->faker->randomElement(['Consultation', 'Lab', 'Pharmacy', 'OP Consultation']),
            'sub_department'=> $this->faker->randomElement(['General', 'Cardiology', 'MRI', 'Pharmacy']),
            'treating_department' => $this->faker->randomElement(['Cardiology', 'Ortho', 'Gynaecology', 'General Medicine']),
            'treating_doctor'     => $this->faker->name('male'),
            'amount'       => $amount,
            'discount_amount' => $discount,
            'net_amount'   => $netAmount,
            'quantity'     => $this->faker->numberBetween(1, 5),
            'status'       => $this->faker->randomElement(['Sale', 'Sale', 'Sale', 'Refund']),
            'payer_type'   => $this->faker->randomElement(['Self', 'Insurance', 'Corporate', 'Government']),
        ];
    }

    public function sale(): static
    {
        return $this->state(['status' => 'Sale']);
    }

    public function forBranch(string $branch): static
    {
        return $this->state(['branch' => $branch]);
    }

    public function forDate(string $date): static
    {
        return $this->state(['bill_date' => $date]);
    }

    public function op(): static  { return $this->state(['patient_type' => 'OP', 'service_type' => 'OP Consultation']); }
    public function ip(): static  { return $this->state(['patient_type' => 'IP']); }
    public function pharmacy(): static { return $this->state(['patient_type' => null, 'service_type' => 'Pharmacy']); }
}
