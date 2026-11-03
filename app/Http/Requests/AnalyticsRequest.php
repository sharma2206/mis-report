<?php

namespace App\Http\Requests;

use App\Models\HospitalBranch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AnalyticsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Route params take precedence over query params (kpi/{branch}/{date} endpoint)
        $merges = [];
        if ($this->route('branch') && ! $this->has('branch')) {
            $merges['branch'] = $this->route('branch');
        }
        if ($this->route('date') && ! $this->has('date')) {
            $merges['date'] = $this->route('date');
        }
        if ($merges) {
            $this->merge($merges);
        }

        if (is_string($this->input('branch')) && str_contains($this->input('branch'), ',')) {
            $this->merge(['branch' => array_values(array_filter(explode(',', $this->input('branch'))))]);
        }
    }

    public function rules(): array
    {
        $maxYear  = now()->year + 1;

        return [
            'branch' => ['nullable'],
            'date'   => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'from'   => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'to'     => 'nullable|date_format:Y-m-d|after_or_equal:from|before_or_equal:today',
            'year'   => "nullable|integer|between:2000,{$maxYear}",
            'limit'  => 'nullable|integer|min:1|max:200',
            'page'   => 'nullable|integer|min:1',
            'date_type' => 'nullable|in:billing,collection,admission,discharge,surgery,as_of',
            'admission_from' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'admission_to' => 'nullable|date_format:Y-m-d|after_or_equal:admission_from|before_or_equal:today',
            'discharge_from' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'discharge_to' => 'nullable|date_format:Y-m-d|after_or_equal:discharge_from|before_or_equal:today',
            'departments' => 'nullable|array|max:100',
            'departments.*' => 'string|max:255',
            'doctors' => 'nullable|array|max:100',
            'doctors.*' => 'string|max:255',
            'patient_types' => 'nullable|array|max:20',
            'patient_types.*' => 'string|max:50',
            'genders' => 'nullable|array|max:10',
            'genders.*' => 'string|max:30',
            'age_groups' => 'nullable|array|max:10',
            'age_groups.*' => 'in:0-18,19-40,41-60,61+',
            'payment_types' => 'nullable|array|max:50',
            'payment_types.*' => 'string|max:100',
            'specialties' => 'nullable|array|max:100',
            'specialties.*' => 'string|max:255',
            'wards' => 'nullable|array|max:100',
            'wards.*' => 'string|max:255',
            'corporate' => 'nullable|array|max:100',
            'corporate.*' => 'string|max:255',
            'insurance' => 'nullable|array|max:100',
            'insurance.*' => 'string|max:255',
            'referral_source' => 'nullable|array|max:100',
            'referral_source.*' => 'string|max:255',
            'payers' => 'nullable|array|max:100',
            'payers.*' => 'string|max:255',
            'service_categories' => 'nullable|array|max:100',
            'service_categories.*' => 'string|max:255',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $value = $this->input('branch');
                $branches = $value === null || $value === 'all'
                    ? []
                    : (is_array($value) ? $value : [$value]);

                if ($branches === []) {
                    return;
                }

                $valid = HospitalBranch::query()
                    ->where('is_active', true)
                    ->whereIn('key', $branches)
                    ->pluck('key')
                    ->all();

                $invalid = array_diff($branches, $valid);
                if ($invalid !== []) {
                    $validator->errors()->add('branch', 'One or more selected branches are invalid.');
                }
            },
        ];
    }

    public function branches(): array|string
    {
        $branch = $this->validated('branch');
        if ($branch === null || $branch === 'all') {
            return 'all';
        }

        return is_array($branch) ? $branch : [$branch];
    }

    public function filters(): array
    {
        $filters = collect($this->validated())
            ->only([
                'departments', 'doctors', 'patient_types', 'genders', 'age_groups',
                'payment_types', 'specialties', 'wards', 'corporate', 'insurance',
                'referral_source', 'payers', 'service_categories',
            ])
            ->filter(fn ($value) => is_array($value) && $value !== [])
            ->all();

        $allowedDepartments = $this->user()?->department_list ?? [];
        if ($allowedDepartments !== []) {
            $filters['departments'] = isset($filters['departments'])
                ? array_values(array_intersect($filters['departments'], $allowedDepartments))
                : $allowedDepartments;
        }

        return $filters;
    }

    public function messages(): array
    {
        return [

            'from.before_or_equal' => 'The from date cannot be in the future.',
            'to.after_or_equal'    => 'The to date must be on or after the from date.',
        ];
    }
}
