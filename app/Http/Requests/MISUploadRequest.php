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
        $branches    = implode(',', array_column(Branch::cases(), 'value'));
        $branch      = $this->route('branch'); // use route param directly — prepareForValidation merges it too
        $csvRules    = ['file', 'max:20480', 'mimetypes:text/plain,text/csv,application/csv,application/octet-stream'];

        return [
            'branch'       => "required|string|in:{$branches}",
            'date'         => 'required|date_format:Y-m-d|before_or_equal:today',
            'bill_file'    => array_merge(['required'], $csvRules),
            'cashier_file' => array_merge(['required'], $csvRules),
            'package_file' => array_merge([$branch === 'chromepet' ? 'required' : 'nullable'], $csvRules),
            'er_file'      => array_merge(['nullable'], $csvRules),
            'ip_file'      => array_merge(['nullable'], $csvRules),
            'surgery_file' => array_merge(['nullable'], $csvRules),
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
            'package_file.required'  => 'The package consumption file is required for Chromepet branch.',
            '*.mimetypes'            => 'Each uploaded file must be a valid CSV (text/plain or text/csv).',
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
