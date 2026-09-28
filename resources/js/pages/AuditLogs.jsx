import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ClipboardList, Search, RefreshCw, Filter } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import DataTable from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { selectToken } from '../store/authSlice';
import { auditLogsApi } from '../services/api';
import { today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';

const colHelper = createColumnHelper();

const EVENT_COLORS = {
    login:    'bg-green-100 text-green-700',
    logout:   'bg-slate-100 text-slate-600',
    import:   'bg-blue-100 text-blue-700',
    export:   'bg-violet-100 text-violet-700',
    delete:   'bg-red-100 text-red-700',
    update:   'bg-amber-100 text-amber-700',
    create:   'bg-teal-100 text-teal-700',
    report:   'bg-indigo-100 text-indigo-700',
    email:    'bg-pink-100 text-pink-700',
    rollback: 'bg-orange-100 text-orange-700',
};

const eventColor = (event = '') => {
    const key = Object.keys(EVENT_COLORS).find(k => event.toLowerCase().includes(k));
    return key ? EVENT_COLORS[key] : 'bg-slate-100 text-slate-600';
};

const COLS = [
    colHelper.accessor('created_at', {
        header: 'Time',
        cell: i => {
            const d = new Date(i.getValue());
            return (
                <div className="flex flex-col">
                    <span className="text-[11px] text-slate-700 tabular-nums">{d.toLocaleDateString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            );
        },
        meta: { className: 'w-28' },
    }),
    colHelper.accessor('event', {
        header: 'Event',
        cell: i => (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600', eventColor(i.getValue()))}>
                {i.getValue()}
            </span>
        ),
        meta: { className: 'min-w-[140px]' },
    }),
    colHelper.accessor('user', {
        header: 'User',
        cell: i => {
            const u = i.getValue();
            return u ? (
                <div className="flex flex-col">
                    <span className="text-[11px] font-600 text-slate-700">{u.name}</span>
                    <span className="text-[10px] text-slate-400">{u.email}</span>
                </div>
            ) : <span className="text-slate-400 text-[11px]">System</span>;
        },
    }),
    colHelper.accessor('branch', {
        header: 'Branch',
        cell: i => i.getValue() ? (
            <span className="capitalize text-[11px] text-slate-600">{i.getValue()}</span>
        ) : <span className="text-slate-300">—</span>,
        meta: { className: 'w-28' },
    }),
    colHelper.accessor('report_date', {
        header: 'Report Date',
        cell: i => i.getValue() ? <span className="text-[11px] tabular-nums text-slate-600">{i.getValue()}</span> : <span className="text-slate-300">—</span>,
        meta: { className: 'w-28' },
    }),
    colHelper.accessor('ip_address', {
        header: 'IP',
        cell: i => <span className="text-[10px] tabular-nums text-slate-400">{i.getValue() || '—'}</span>,
        meta: { className: 'w-28' },
    }),
];

export default function AuditLogs() {
    const token = useSelector(selectToken);
    const todayStr = today();

    const [search,   setSearch]   = useState('');
    const [branch,   setBranch]   = useState('');
    const [from,     setFrom]     = useState('');
    const [to,       setTo]       = useState('');
    const [page,     setPage]     = useState(1);

    const params = { per_page: 50, page };
    if (search) params.event  = search;
    if (branch) params.branch = branch;
    if (from)   params.from   = from;
    if (to)     params.to     = to;

    const q = useQuery({
        queryKey: ['audit-logs', params],
        queryFn:  () => auditLogsApi.list(params).then(r => r.data),
        placeholderData: (prev) => prev,
    });

    if (!token) return <Navigate to="/login" replace />;

    const logs = q.data?.success ? (q.data.data ?? []) : [];
    const meta = q.data?.meta ?? {};

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Audit Logs</h1>
                    <p className="text-[11px] text-slate-400">System-wide event history</p>
                </div>
                <button onClick={() => q.refetch()}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', q.isFetching && 'animate-spin text-slate-500')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Filter bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">Search Event</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="login, import, export…"
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-slate-400 placeholder:text-slate-300" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">Branch</label>
                        <select value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400 bg-white cursor-pointer">
                            <option value="">All Branches</option>
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
                    {(search || branch || from || to) && (
                        <button onClick={() => { setSearch(''); setBranch(''); setFrom(''); setTo(''); setPage(1); }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
                            Clear
                        </button>
                    )}
                </div>

                {/* Stat line */}
                {meta.total > 0 && (
                    <p className="text-[11px] text-slate-400 px-1">
                        Showing {logs.length} of {meta.total.toLocaleString()} events
                        {meta.last_page > 1 && ` · Page ${meta.current_page} / ${meta.last_page}`}
                    </p>
                )}

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Filter className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-[12px] font-700 text-slate-700 flex-1">Event Log</span>
                    </div>
                    <div className="p-4">
                        {q.isLoading ? <TableSkeleton rows={12} cols={6} /> : logs.length === 0 ? (
                            <EmptyState icon={ClipboardList} title="No audit events" description="No events match the current filters." />
                        ) : (
                            <DataTable data={logs} columns={COLS} pageSize={50} emptyText="No events found." />
                        )}
                    </div>
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
