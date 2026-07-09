<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $q = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($request->filled('event_type')) {
            $q->where('event', 'like', '%' . $request->event_type . '%');
        }
        if ($request->filled('branch')) {
            $q->where('branch', $request->branch);
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
        $count = AuditLog::whereDate('created_at', '>=', now()->subDay())
            ->count();

        return response()->json(['success' => true, 'data' => ['unread' => $count]]);
    }
}
