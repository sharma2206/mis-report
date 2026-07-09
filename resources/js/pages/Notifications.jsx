import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, RefreshCw, Search, LogIn, Upload, Download, Trash2, Mail, FileText, AlertTriangle, Info } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { selectToken } from '../store/authSlice';
import { notificationsApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';

const EVENT_META = {
    login:    { icon: LogIn,      color: 'text-green-600',  bg: 'bg-green-100',  label: 'Login' },
    logout:   { icon: LogIn,      color: 'text-slate-400',  bg: 'bg-slate-100',  label: 'Logout' },
    import:   { icon: Upload,     color: 'text-blue-600',   bg: 'bg-blue-100',   label: 'Import' },
    export:   { icon: Download,   color: 'text-violet-600', bg: 'bg-violet-100', label: 'Export' },
    delete:   { icon: Trash2,     color: 'text-red-600',    bg: 'bg-red-100',    label: 'Delete' },
    email:    { icon: Mail,       color: 'text-pink-600',   bg: 'bg-pink-100',   label: 'Email' },
    report:   { icon: FileText,   color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Report' },
    rollback: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Rollback' },
};

const getEventMeta = (event = '') => {
    const key = Object.keys(EVENT_META).find(k => event.toLowerCase().includes(k));
    return key ? EVENT_META[key] : { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100', label: event };
};

const TYPES = [
    { key: '',        label: 'All' },
    { key: 'login',   label: 'Logins' },
    { key: 'import',  label: 'Imports' },
    { key: 'export',  label: 'Exports' },
    { key: 'email',   label: 'Emails' },
    { key: 'delete',  label: 'Deletes' },
    { key: 'report',  label: 'Reports' },
    { key: 'rollback',label: 'Rollbacks' },
];

const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN');
};

export default function Notifications() {
    const token    = useSelector(selectToken);
    const todayStr = today();

    const [type,   setType]   = useState('');
    const [branch, setBranch] = useState('');
    const [from,   setFrom]   = useState('');
    const [to,     setTo]     = useState('');
    const [page,   setPage]   = useState(1);

    const params = { per_page: 30, page };
    if (type)   params.event_type = type;
    if (branch) params.branch     = branch;
    if (from)   params.from       = from;
    if (to)     params.to         = to;

    const q = useQuery({
        queryKey: ['notifications', params],
        queryFn:  () => notificationsApi.list(params).then(r => r.data),
        keepPreviousData: true,
        refetchInterval: 60_000,
    });

    if (!token) return <Navigate to="/login" replace />;

    const logs = q.data?.success ? (q.data.data ?? []) : [];
    const meta = q.data?.meta ?? {};

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Notifications</h1>
                    <p className="text-[11px] text-slate-400">System activity feed · auto-refreshes every minute</p>
                </div>
                <button onClick={() => q.refetch()}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', q.isFetching && 'animate-spin text-amber-500')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
                    {/* Type chips */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">Event Type</label>
                        <div className="flex gap-1.5 flex-wrap">
                            {TYPES.map(t => (
                                <button key={t.key} onClick={() => { setType(t.key); setPage(1); }}
                                    className={cn('px-3 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer',
                                        type === t.key
                                            ? 'bg-amber-500 border-amber-500 text-white'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700')}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 ml-auto">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">Branch</label>
                        <select value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400 bg-white cursor-pointer">
                            <option value="">All</option>
                            <option value="chromepet">Chromepet</option>
                            <option value="oragadam">Oragadam</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">From</label>
                        <input type="date" value={from} max={to || todayStr} onChange={e => { setFrom(e.target.value); setPage(1); }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">To</label>
                        <input type="date" value={to} min={from} max={todayStr} onChange={e => { setTo(e.target.value); setPage(1); }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400" />
                    </div>
                    {(type || branch || from || to) && (
                        <button onClick={() => { setType(''); setBranch(''); setFrom(''); setTo(''); setPage(1); }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
                            Clear
                        </button>
                    )}
                </div>

                {/* Feed */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-[12px] font-700 text-slate-700 flex-1">Activity Feed</span>
                        {meta.total > 0 && (
                            <span className="text-[10px] text-slate-400">{meta.total.toLocaleString()} events</span>
                        )}
                    </div>

                    {q.isLoading ? (
                        <div className="p-4"><TableSkeleton rows={8} cols={1} /></div>
                    ) : logs.length === 0 ? (
                        <div className="p-4">
                            <EmptyState icon={Bell} title="No notifications" description="No system events match the current filters." />
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {logs.map((log, i) => {
                                const meta_ = getEventMeta(log.event);
                                const Icon  = meta_.icon;
                                return (
                                    <motion.li key={log.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', meta_.bg)}>
                                            <Icon className={cn('w-3.5 h-3.5', meta_.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="text-[12px] font-600 text-slate-700">{log.event}</span>
                                                {log.branch && (
                                                    <span className="text-[10px] text-slate-400 capitalize">{log.branch}</span>
                                                )}
                                                {log.report_date && (
                                                    <span className="text-[10px] text-slate-400">· {log.report_date}</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                {log.user ? `${log.user.name} (${log.user.email})` : 'System'}
                                                {log.ip_address && ` · ${log.ip_address}`}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-1">{timeAgo(log.created_at)}</span>
                                    </motion.li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Pagination */}
                {meta.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed">
                            ← Prev
                        </button>
                        <span className="text-[11px] text-slate-500">Page {meta.current_page} of {meta.last_page}</span>
                        <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed">
                            Next →
                        </button>
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
