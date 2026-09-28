import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, CheckCircle, Activity, Calendar, Mail, FileText } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { selectToken } from '../store/authSlice';
import { schedulerApi } from '../services/api';
import { cn } from '../utils/cn';

const TYPE_COLORS = {
    mis: { badge: 'bg-blue-100 text-blue-700',   icon: FileText, dot: 'bg-blue-500' },
    brm: { badge: 'bg-violet-100 text-violet-700', icon: Mail,    dot: 'bg-violet-500' },
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN');
};

export default function Scheduler() {
    const token = useSelector(selectToken);

    const q = useQuery({
        queryKey: ['scheduler-status'],
        queryFn:  () => schedulerApi.status().then(r => r.data),
        refetchInterval: 120_000,
    });

    if (!token) return <Navigate to="/login" replace />;

    const schedules  = q.data?.data?.schedules   ?? [];
    const recentRuns = q.data?.data?.recent_runs  ?? [];
    const isLoading  = q.isLoading;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Scheduler</h1>
                    <p className="text-[11px] text-slate-400">Automated report schedule &amp; run history</p>
                </div>
                <button onClick={() => q.refetch()}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', q.isFetching && 'animate-spin text-indigo-500')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Schedule grid */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                        <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-[12px] font-700 text-slate-700 flex-1">Configured Schedules</span>
                        <span className="text-[10px] text-slate-400">{schedules.length} jobs</span>
                    </div>
                    <div className="p-4">
                        {isLoading ? <TableSkeleton rows={5} cols={3} /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {schedules.map((s, i) => {
                                    const tm  = TYPE_COLORS[s.type] ?? TYPE_COLORS.mis;
                                    const Ico = tm.icon;
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', tm.badge)}>
                                                    <Ico className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[12px] font-700 text-slate-800">{s.name}</span>
                                                        <span className={cn('text-[9px] font-700 uppercase px-1.5 py-0.5 rounded-full', tm.badge)}>{s.type.toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[11px] text-slate-500">{s.schedule}</span>
                                                    </div>
                                                    <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded font-mono truncate block">{s.command}</code>
                                                </div>
                                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1', tm.dot)} title="Configured" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent run history */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-[12px] font-700 text-slate-700 flex-1">Recent Activity</span>
                        <span className="text-[10px] text-slate-400">last 50 matching events</span>
                    </div>
                    <div className="p-4">
                        {isLoading ? <TableSkeleton rows={6} cols={4} /> : recentRuns.length === 0 ? (
                            <EmptyState icon={Activity} title="No scheduled runs recorded" description="Scheduled report events will appear here after they run." />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentRuns.map((run, i) => (
                                    <motion.li key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                        className="flex items-center gap-3 py-2.5">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-600 text-slate-700">{run.event}</span>
                                            {run.branch && <span className="text-[10px] text-slate-400 ml-2 capitalize">{run.branch}</span>}
                                            {run.report_date && <span className="text-[10px] text-slate-400 ml-1">· {run.report_date}</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(run.created_at)}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Info box */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
                    <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[12px] font-600 text-indigo-800 mb-1">How the scheduler works</p>
                        <p className="text-[11px] text-indigo-600 leading-relaxed">
                            Reports are dispatched automatically by Laravel's task scheduler defined in <code className="font-mono bg-indigo-100 px-1 rounded">routes/console.php</code>.
                            Ensure <code className="font-mono bg-indigo-100 px-1 rounded">php artisan schedule:run</code> is registered as a system cron job running every minute.
                            All dispatched jobs are queued and processed by the configured queue worker.
                        </p>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
