<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'employee_id'          => $this->employee_id,
            'employee_code'        => $this->employee_code,
            'name'                 => $this->name,
            'email'                => $this->email,
            'mobile'               => $this->mobile,
            'avatar'               => $this->avatar,
            'designation'          => $this->designation,
            'department'           => $this->department,
            'speciality'           => $this->speciality,
            'role'                 => $this->role,
            'branch'               => $this->branch,
            'employment_status'    => $this->employment_status,
            'is_active'            => $this->is_active,
            'status'               => $this->status,
            'locked_at'            => $this->locked_at?->toISOString(),
            'last_login_at'        => $this->last_login_at?->toISOString(),
            'last_login_human'     => $this->last_login_at?->diffForHumans(),
            'last_logout_at'       => $this->last_logout_at?->toISOString(),
            'password_changed_at'  => $this->password_changed_at?->toISOString(),
            'password_expires_at'  => $this->password_expires_at?->toISOString(),
            'mfa_enabled'          => $this->mfa_enabled,
            'failed_login_attempts'=> $this->failed_login_attempts,
            'date_of_joining'      => $this->date_of_joining?->toDateString(),
            'created_at'           => $this->created_at->toISOString(),
            'updated_at'           => $this->updated_at->toISOString(),

            // Relationships (conditional)
            'profile'             => $this->whenLoaded('profile'),
            'roles'               => $this->whenLoaded('roles', fn () => $this->roles->map(fn ($r) => [
                'id' => $r->id, 'name' => $r->name, 'slug' => $r->slug, 'color' => $r->color,
            ])),
            'branches'            => $this->whenLoaded('userBranches', fn () => $this->userBranches->pluck('branch')),
            'departments'         => $this->whenLoaded('userDepartments', fn () => $this->userDepartments->pluck('department')),
            'reporting_manager'   => $this->whenLoaded('reportingManager', fn () => $this->reportingManager
                ? ['id' => $this->reportingManager->id, 'name' => $this->reportingManager->name]
                : null),
            'login_logs'          => $this->whenLoaded('loginLogs'),
        ];
    }
}
