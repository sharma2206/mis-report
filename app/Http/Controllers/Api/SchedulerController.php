<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class SchedulerController extends Controller
{
    public function status()
    {
        $schedules = [
            ['name' => 'MIS Report Daily',    'command' => 'mis:send-report all daily',    'schedule' => 'Daily at 07:00',        'type' => 'mis'],
            ['name' => 'MIS Report Weekly',   'command' => 'mis:send-report all weekly',   'schedule' => 'Mondays at 08:00',      'type' => 'mis'],
            ['name' => 'MIS Report Monthly',  'command' => 'mis:send-report all monthly',  'schedule' => '1st of month at 08:00', 'type' => 'mis'],
            ['name' => 'BRM Report Weekly',   'command' => 'brm:send-report all weekly',   'schedule' => 'Mondays at 08:30',      'type' => 'brm'],
            ['name' => 'BRM Report Monthly',  'command' => 'brm:send-report all monthly',  'schedule' => 'Last day of month 22:00','type' => 'brm'],
        ];

        $recentRuns = AuditLog::where('event', 'like', 'scheduled_%')
            ->orWhere('event', 'like', 'report_%')
            ->orWhere('event', 'like', 'mis_%')
            ->orWhere('event', 'like', 'brm_%')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'event', 'branch', 'report_date', 'payload', 'created_at', 'user_id']);

        return response()->json([
            'success' => true,
            'data'    => [
                'schedules'   => $schedules,
                'recent_runs' => $recentRuns,
            ],
        ]);
    }
}
