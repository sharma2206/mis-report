<?php

namespace App\Http\Requests;

use App\Enums\Branch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validates a single-report upload.
 * At least one of the six CSV file fields must be present.
 * Unlike MISUploadRequest, no specific file is required.
 */
class MISUploadSingleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'branch' => $this->route('branch') ?? $this->input('branch'),
        ]);
    }

    public function rules(): array
    {
        $branches = implode(',', array_column(Branch::cases(), 'value'));
        $csv      = ['nullable', 'file', 'max:30720', 'mimetypes:text/plain,text/csv,application/csv,application/octet-stream'];

        return [
            'branch'       => "required|string|in:{$branches}",
            'date'         => 'required|date_format:Y-m-d|before_or_equal:today',
            'bill_file'    => $csv,
            'cashier_file' => $csv,
            'package_file' => $csv,
            'er_file'      => $csv,
            'ip_file'      => $csv,
            'surgery_file' => $csv,
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $files = ['bill_file', 'cashier_file', 'package_file', 'er_file', 'ip_file', 'surgery_file'];
            $hasAny = collect($files)->some(fn($f) => $this->hasFile($f));
            if (! $hasAny) {
                $v->errors()->add('file', 'At least one CSV file must be uploaded.');
            }
        });
    }

    public function branch(): Branch
    {
        return Branch::from($this->validated('branch'));
    }

    public function reportDate(): string
    {
        return $this->validated('date');
    }
}
