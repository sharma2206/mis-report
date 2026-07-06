<?php

namespace App\Http\Requests;

use App\Enums\Branch;
use Illuminate\Foundation\Http\FormRequest;

class MISUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'branch' => $this->route('branch') ?? $this->input('branch'),
            'date'   => $this->route('date') ?? $this->input('date'),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Chromepet requires 3 files (bill, cashier, package).
     * Oragadam requires 2 files (bill, cashier).
     *
     * All KPI values (occupancy, admissions, discharges, ER count, etc.) are
     * calculated automatically from the imported data — no manual volume
     * fields are accepted here.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $branches = implode(',', array_map(fn($case) => $case->value, Branch::cases()));

        return [
            'branch'       => "required|string|in:{$branches}",
            'date'         => 'required|date_format:Y-m-d|before_or_equal:today',
            'bill_file'    => 'required|file|mimes:csv|max:20480',
            'cashier_file' => 'required|file|mimes:csv|max:20480',
            'package_file' => 'required_if:branch,chromepet|nullable|file|mimes:csv|max:20480',
            'er_file'      => 'nullable|file|mimes:csv|max:20480',
            'ip_file'      => 'nullable|file|mimes:csv|max:20480',
            'surgery_file' => 'nullable|file|mimes:csv|max:20480',
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'package_file.required_if' => 'The package consumption file is required for Chromepet branch.',
        ];
    }

    /**
     * Get the branch enum instance.
     *
     * @return Branch
     */
    public function branch(): Branch
    {
        return Branch::from($this->validated('branch'));
    }

    /**
     * Get the validated date string.
     *
     * @return string
     */
    public function reportDate(): string
    {
        return $this->validated('date');
    }
}
