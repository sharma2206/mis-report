<?php

namespace App\Http\Controllers\Api;

use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;

class RbacController extends Controller
{
    public function __construct(private RoleService $service) {}

    // ─── Roles ───────────────────────────────────────────────────────────────

    public function indexRoles(Request $request): JsonResponse
    {
        $filters = array_filter([
            'search'    => $request->query('search'),
            'is_active' => $request->has('is_active') ? (bool) $request->query('is_active') : null,
            'type'      => $request->query('type'),
        ], fn ($v) => $v !== null);

        return response()->json([
            'success' => true,
            'data'    => $this->service->all($filters),
        ]);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:roles,name',
            'description' => 'nullable|string|max:500',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
        ]);

        $role = $this->service->create($data, $request->user()->id);

        return response()->json(['success' => true, 'data' => $role], 201);
    }

    public function showRole(int $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->service->find($id),
        ]);
    }

    public function updateRole(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
            'is_active'   => 'sometimes|boolean',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->service->update($id, $data, $request->user()->id),
        ]);
    }

    public function destroyRole(Request $request, int $id): JsonResponse
    {
        try {
            $this->service->delete($id, $request->user()->id);
            return response()->json(['success' => true, 'message' => 'Role deleted.']);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function cloneRole(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->service->clone($id, $data['name'], $request->user()->id),
        ], 201);
    }

    public function toggleRole(Request $request, int $id): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data'    => $this->service->toggle($id, $request->user()->id),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ─── Permissions ─────────────────────────────────────────────────────────

    public function indexPermissions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->service->getPermissionsGrouped(),
        ]);
    }

    public function updateRolePermissions(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'permission_ids'   => 'required|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $this->service->syncPermissions($id, $data['permission_ids'], $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Permissions updated.']);
    }

    public function updateRoleBranches(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'branches'   => 'required|array',
            'branches.*' => 'string|in:chromepet,oragadam',
        ]);

        $this->service->syncBranches($id, $data['branches'], $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Branches updated.']);
    }

    // ─── Users ───────────────────────────────────────────────────────────────

    public function getRoleUsers(int $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->service->getRoleUsers($id),
        ]);
    }

    public function assignRoles(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'    => 'required|integer|exists:users,id',
            'role_ids'   => 'required|array',
            'role_ids.*' => 'integer|exists:roles,id',
        ]);

        $this->service->assignRolesToUser($data['user_id'], $data['role_ids'], $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Roles assigned.']);
    }

    public function removeRoleFromUser(Request $request, int $roleId, int $userId): JsonResponse
    {
        $this->service->removeRoleFromUser($userId, $roleId, $request->user()->id);
        return response()->json(['success' => true, 'message' => 'Role removed from user.']);
    }

    // ─── Stats + Audit ───────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->service->getStats(),
        ]);
    }

    public function audit(Request $request): JsonResponse
    {
        $roleId = $request->query('role_id');

        $data = $roleId
            ? $this->service->getAudit((int) $roleId)
            : $this->service->getAuditAll();

        return response()->json(['success' => true, 'data' => $data]);
    }
}
