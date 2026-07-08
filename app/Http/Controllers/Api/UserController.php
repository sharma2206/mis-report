<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(private UserService $service) {}

    // GET /api/v1/users
    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'search'            => $request->query('search'),
            'branch'            => $request->query('branch'),
            'role'              => $request->query('role'),
            'department'        => $request->query('department'),
            'employment_status' => $request->query('employment_status'),
            'status'            => $request->query('status'),
            'sort_by'           => $request->query('sort_by', 'created_at'),
            'sort_dir'          => $request->query('sort_dir', 'desc'),
        ], fn ($v) => $v !== null && $v !== '');

        $perPage = min((int) $request->query('per_page', 20), 100);
        $paginated = $this->service->list($filters, $perPage);

        return response()->json([
            'success' => true,
            'data'    => UserResource::collection($paginated->items()),
            'meta'    => [
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
            ],
        ]);
    }

    // GET /api/v1/users/stats
    public function stats(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->getStats()]);
    }

    // GET /api/v1/users/select
    public function select(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->allForSelect()]);
    }

    // GET /api/v1/users/{id}
    public function show(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => new UserResource($this->service->find($id))]);
    }

    // POST /api/v1/users
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'required|string|max:100',
            'email'                   => 'required|email|unique:users,email',
            'password'                => 'required|string|min:8|confirmed',
            'role'                    => 'sometimes|in:viewer,staff,manager,admin',
            'branch'                  => 'nullable|in:chromepet,oragadam',
            'employee_id'             => 'nullable|string|max:50|unique:users,employee_id',
            'employee_code'           => 'nullable|string|max:50',
            'mobile'                  => 'nullable|string|max:20',
            'designation'             => 'nullable|string|max:100',
            'department'              => 'nullable|string|max:100',
            'speciality'              => 'nullable|string|max:100',
            'reporting_manager_id'    => 'nullable|exists:users,id',
            'date_of_joining'         => 'nullable|date',
            'employment_status'       => 'nullable|in:active,on_leave,resigned,terminated,probation',
            'mfa_enabled'             => 'boolean',
            'display_name'            => 'nullable|string|max:100',
            'emergency_contact_name'  => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'bio'                     => 'nullable|string|max:1000',
            'role_ids'                => 'nullable|array',
            'role_ids.*'              => 'integer|exists:roles,id',
            'branches'                => 'nullable|array',
            'branches.*'              => 'string|in:chromepet,oragadam',
            'departments'             => 'nullable|array',
            'departments.*'           => 'string|max:100',
        ]);

        $user = $this->service->create($data, $request->user()->id, $request);

        return response()->json(['success' => true, 'data' => new UserResource($user)], 201);
    }

    // PUT /api/v1/users/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'sometimes|string|max:100',
            'email'                   => "sometimes|email|unique:users,email,{$id}",
            'password'                => 'sometimes|nullable|string|min:8|confirmed',
            'role'                    => 'sometimes|in:viewer,staff,manager,admin',
            'branch'                  => 'nullable|in:chromepet,oragadam',
            'employee_id'             => "nullable|string|max:50|unique:users,employee_id,{$id}",
            'employee_code'           => 'nullable|string|max:50',
            'mobile'                  => 'nullable|string|max:20',
            'designation'             => 'nullable|string|max:100',
            'department'              => 'nullable|string|max:100',
            'speciality'              => 'nullable|string|max:100',
            'reporting_manager_id'    => 'nullable|exists:users,id',
            'date_of_joining'         => 'nullable|date',
            'employment_status'       => 'nullable|in:active,on_leave,resigned,terminated,probation',
            'mfa_enabled'             => 'boolean',
            'avatar'                  => 'nullable|url|max:500',
            'display_name'            => 'nullable|string|max:100',
            'emergency_contact_name'  => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'bio'                     => 'nullable|string|max:1000',
            'notes'                   => 'nullable|string|max:1000',
            'timezone'                => 'nullable|string|max:50',
            'role_ids'                => 'nullable|array',
            'role_ids.*'              => 'integer|exists:roles,id',
            'branches'                => 'nullable|array',
            'branches.*'              => 'string|in:chromepet,oragadam',
            'departments'             => 'nullable|array',
            'departments.*'           => 'string|max:100',
        ]);

        $user = $this->service->update($id, $data, $request->user()->id, $request);

        return response()->json(['success' => true, 'data' => new UserResource($user)]);
    }

    // DELETE /api/v1/users/{id}
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $this->service->delete($id, $request->user()->id, $request);
            return response()->json(['success' => true, 'message' => 'User deleted.']);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // POST /api/v1/users/{id}/activate
    public function activate(Request $request, int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => new UserResource($this->service->activate($id, $request->user()->id, $request))]);
    }

    // POST /api/v1/users/{id}/deactivate
    public function deactivate(Request $request, int $id): JsonResponse
    {
        try {
            return response()->json(['success' => true, 'data' => new UserResource($this->service->deactivate($id, $request->user()->id, $request))]);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // POST /api/v1/users/{id}/lock
    public function lock(Request $request, int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => new UserResource($this->service->lock($id, $request->user()->id, $request))]);
    }

    // POST /api/v1/users/{id}/unlock
    public function unlock(Request $request, int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => new UserResource($this->service->unlock($id, $request->user()->id, $request))]);
    }

    // POST /api/v1/users/{id}/reset-password
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'password'  => 'required|string|min:8|confirmed',
            'force_change' => 'boolean',
        ]);

        $this->service->resetPassword($id, $data['password'], $request->user()->id, $data['force_change'] ?? true, $request);

        return response()->json(['success' => true, 'message' => 'Password reset successfully.']);
    }

    // POST /api/v1/users/{id}/clone
    public function clone(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
        ]);

        $user = $this->service->clone($id, $data, $request->user()->id, $request);

        return response()->json(['success' => true, 'data' => new UserResource($user)], 201);
    }

    // PUT /api/v1/users/{id}/roles
    public function syncRoles(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'role_ids'   => 'required|array',
            'role_ids.*' => 'integer|exists:roles,id',
        ]);
        $this->service->update($id, ['role_ids' => $data['role_ids']], $request->user()->id, $request);
        return response()->json(['success' => true, 'message' => 'Roles updated.']);
    }

    // PUT /api/v1/users/{id}/branches
    public function syncBranches(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'branches'   => 'required|array',
            'branches.*' => 'string|in:chromepet,oragadam',
        ]);
        $this->service->update($id, ['branches' => $data['branches']], $request->user()->id, $request);
        return response()->json(['success' => true, 'message' => 'Branches updated.']);
    }

    // PUT /api/v1/users/{id}/departments
    public function syncDepartments(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'departments'   => 'required|array',
            'departments.*' => 'string|max:100',
        ]);
        $this->service->update($id, ['departments' => $data['departments']], $request->user()->id, $request);
        return response()->json(['success' => true, 'message' => 'Departments updated.']);
    }

    // POST /api/v1/users/bulk
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action'       => 'required|in:activate,deactivate,lock,unlock,assign_role,assign_branch,assign_department,delete',
            'user_ids'     => 'required|array|min:1',
            'user_ids.*'   => 'integer|exists:users,id',
            'role_ids'     => 'nullable|array',
            'role_ids.*'   => 'integer|exists:roles,id',
            'branches'     => 'nullable|array',
            'branches.*'   => 'string',
            'departments'  => 'nullable|array',
            'departments.*'=> 'string',
        ]);

        $result = $this->service->bulkAction(
            $data['action'],
            $data['user_ids'],
            array_intersect_key($data, array_flip(['role_ids', 'branches', 'departments'])),
            $request->user()->id,
            $request,
        );

        return response()->json(['success' => true, 'data' => $result]);
    }

    // GET /api/v1/users/export
    public function export(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $filters = $request->only(['search', 'branch', 'role', 'department', 'status']);
        $csv = $this->service->export($filters);
        $filename = 'users_' . now()->format('Ymd_His') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // GET /api/v1/users/{id}/login-logs
    public function loginLogs(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->getLoginLogs($id)]);
    }
}
