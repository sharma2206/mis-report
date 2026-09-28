<?php

namespace App\Http\Requests;

use App\Enums\Branch;
use Illuminate\Foundation\Http\FormRequest;

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
    }

    public function rules(): array
    {
        $branches = implode(',', array_column(Branch::cases(), 'value'));
        $maxYear  = now()->year + 1;

        return [
            'branch' => 'nullable', // Can be string, comma-separated string, or array
            'date'   => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'from'   => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'to'     => 'nullable|date_format:Y-m-d|after_or_equal:from|before_or_equal:today',
            'year'   => "nullable|integer|between:2000,{$maxYear}",
            'limit'  => 'nullable|integer|min:1|max:200',
            'page'   => 'nullable|integer|min:1',
        ];
    }

    public function messages(): array
    {
        return [

            'from.before_or_equal' => 'The from date cannot be in the future.',
            'to.after_or_equal'    => 'The to date must be on or after the from date.',
        ];
    }
}
