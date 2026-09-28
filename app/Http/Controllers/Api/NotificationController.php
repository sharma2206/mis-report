<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q    = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        // Scope to branches the requesting user can access.
        if ($user->branch) {
            $accessible = array_merge(
                [$user->branch],
                $user->branches ?? [],
            );
            $q->where(function ($sub) use ($accessible) {
                $sub->whereIn('branch', $accessible)->orWhereNull('branch');
            });
        }

        if ($request->filled('event_type')) {
            $q->where('event', 'like', '%' . $request->event_type . '%');
        }
        if ($request->filled('branch')) {
            // Secondary filter only narrows within already-scoped results.
            if ($user->canAccessBranch($request->branch)) {
                $q->where('branch', $request->branch);
            }
        }
        if ($request->filled('from')) {
            $q->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $q->whereDate('created_at', '<=', $request->to);
        }

        $perPage = min((int) ($request->per_page ?? 30), 100);
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

    public function unread(Request $request)
    {
        $user = $request->user();
        $q    = AuditLog::whereDate('created_at', '>=', now()->subDay());

        if ($user->branch) {
            $accessible = array_merge([$user->branch], $user->branches ?? []);
            $q->where(function ($sub) use ($accessible) {
                $sub->whereIn('branch', $accessible)->orWhereNull('branch');
            });
        }

        return response()->json(['success' => true, 'data' => ['unread' => $q->count()]]);
    }
}
