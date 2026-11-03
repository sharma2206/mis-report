<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $q = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        $this->scopeToAccessibleBranches($request, $q);

        if ($request->filled('event')) {
            $q->where('event', 'like', '%' . $request->event . '%');
        }
        if ($request->filled('branch')) {
            if (! $request->user()->canAccessBranch($request->branch)) {
                return response()->json(['success' => false, 'message' => 'Access denied for this branch.'], 403);
            }
            $q->where('branch', $request->branch);
        }
        if ($request->filled('user_id')) {
            $q->where('user_id', $request->user_id);
        }
        if ($request->filled('from')) {
            $q->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $q->whereDate('created_at', '<=', $request->to);
        }

        $perPage = min((int) ($request->per_page ?? 50), 200);
        $logs    = $q->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $logs->items(),
            'meta'    => [
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }

    public function events()
    {
        $events = AuditLog::select('event')
            ->distinct()
            ->orderBy('event')
            ->pluck('event');

        return response()->json(['success' => true, 'data' => $events]);
    }

    /**
     * Restricted users only see events for their branches, plus events with no branch.
     */
    private function scopeToAccessibleBranches(Request $request, $query): void
    {
        $user = $request->user();

        if (! $user->restrictsBranches()) {
            return;
        }

        $accessible = $user->branch_list;

        $query->where(function ($sub) use ($accessible) {
            $sub->whereIn('branch', $accessible)->orWhereNull('branch');
        });
    }
}
