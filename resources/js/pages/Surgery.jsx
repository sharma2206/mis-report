import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import { Scissors, Activity, Users, Calendar, RefreshCw, ShieldAlert, Star } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES, CHART_PALETTE, DATE_PRESETS } from '../constants';
import { monthStart, resolvePresetRange, today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';

const Section = ({ title, icon: Icon, children, action }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
            {Icon && (
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
            )}
            <span className="text-[12px] font-700 text-slate-700 flex-1">{title}</span>
            {action}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const colHelper = createColumnHelper();

const SURGEON_COLS = [
    colHelper.display({ id: 'rank', header: '#', cell: i => <span className="text-slate-400">{i.row.index + 1}</span>, enableSorting: false, meta: { className: 'w-8 text-center' } }),
    colHelper.accessor('surgeon',   { header: 'Surgeon',   cell: i => <span className="font-600 text-slate-800">{i.getValue() || '—'}</span>, meta: { className: 'min-w-[140px]' } }),
    colHelper.accessor('speciality',{ header: 'Speciality',cell: i => <span className="text-slate-500 text-[12px]">{i.getValue() || '—'}</span> }),
    colHelper.accessor('count',     { header: 'Surgeries', cell: i => <span className="font-700 tabular-nums">{i.getValue()}</span>, meta: { align: 'right' } }),
];

const OT_COLS = [
    colHelper.accessor('ot_name', { header: 'OT Room',   cell: i => <span className="font-600 text-slate-800">{i.getValue() || 'Unknown'}</span> }),
    colHelper.accessor('count',   { header: 'Surgeries', cell: i => <span className="font-700 tabular-nums">{i.getValue()}</span>, meta: { align: 'right' } }),
];

export default function Surgery() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);
    const todayStr = today();

    const [from,   setFrom]   = useState(() => monthStart(date) || date);
    const [to,     setTo]     = useState(date);
    const [preset, setPreset] = useState('mtd');

    const applyPreset = (key) => {
        const r = resolvePresetRange(key);
        setFrom(r.from); setTo(r.to); setPreset(key);
    };

    const enabled = !!(branch && from && to);

    const surgQ = useQuery({
        queryKey: ['surgery-detail', branch, from, to],
        queryFn:  () => analyticsApi.surgeryDetail({ branch, from, to }).then(r => r.data),
        enabled,
    });
    const overviewQ = useQuery({
        queryKey: ['surgeries', branch, from, to],
        queryFn:  () => analyticsApi.surgeries({ branch, from, to }).then(r => r.data),
        enabled,
    });

    if (!token) return <Navigate to="/login" replace />;

    const detail   = surgQ.data?.success   ? (surgQ.data.data ?? {})   : {};
    const overview = overviewQ.data?.success ? (overviewQ.data.data ?? {}) : {};
    const isLoading = surgQ.isLoading;

    const total      = detail.total      ?? 0;
    const major      = detail.major      ?? 0;
    const minor      = detail.minor      ?? 0;
    const emergency  = detail.emergency  ?? 0;
    const elective   = detail.elective   ?? 0;
    const implant    = detail.implant    ?? 0;
    const daySurg    = detail.day_surgery ?? 0;
    const paediatric = detail.age_below_18 ?? 0;

    const bySurgeon    = detail.by_surgeon     ?? [];
    const byOtRoom     = detail.by_ot_room     ?? [];
    const byPayer      = detail.by_payer_type  ?? [];
    const byAnaes      = detail.by_anaesthesia_type ?? [];
    const byDept       = detail.by_dept        ?? [];

    const branchLabel = BRANCHES[branch]?.label || branch;

    const kpis = [
        { label: 'Total Surgeries', value: total,      color: 'violet'  },
        { label: 'Major',           value: major,      color: 'red'     },
        { label: 'Minor',           value: minor,      color: 'blue'    },
        { label: 'Emergency',       value: emergency,  color: 'orange'  },
        { label: 'Elective',        value: elective,   color: 'emerald' },
        { label: 'With Implant',    value: implant,    color: 'amber'   },
        { label: 'Day Surgery',     value: daySurg,    color: 'teal'    },
        { label: 'Paediatric',      value: paediatric, color: 'pink'    },
    ];

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Surgery Analytics</h1>
                    <p className="text-[11px] text-slate-400">{branchLabel} · {from} – {to}</p>
                </div>
                <button onClick={() => { surgQ.refetch(); overviewQ.refetch(); }}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', (surgQ.isFetching || overviewQ.isFetching) && 'animate-spin text-red-600')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex gap-1.5 flex-wrap">
                        {DATE_PRESETS.map(b => (
                            <button key={b.key} onClick={() => applyPreset(b.key)}
                                className={cn('px-3 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer',
                                    preset === b.key
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-700')}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">From</label>
                            <input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPreset(''); }}
                                className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-red-400" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">To</label>
                            <input type="date" value={to} min={from} max={todayStr} onChange={e => { setTo(e.target.value); setPreset(''); }}
                                className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-red-400" />
                        </div>
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {kpis.map(({ label, value, color }, i) => (
                        <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                            <div className={`text-[1.2rem] font-800 tabular-nums text-${color}-700`}>
                                {isLoading ? '—' : value}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Charts row 1 */}
                {!isLoading && total > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Major / Minor split */}
                        <Section title="Major vs Minor" icon={Scissors}>
                            <EChart height={200} option={{
                                tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                series: [{
                                    type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                    data: [
                                        { name: 'Major', value: major, itemStyle: { color: '#dc2626' } },
                                        { name: 'Minor', value: minor, itemStyle: { color: '#3b82f6' } },
                                    ].filter(d => d.value > 0),
                                    label: { show: false },
                                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
                                }],
                            }} />
                        </Section>

                        {/* Emergency vs Elective */}
                        <Section title="Emergency vs Elective" icon={ShieldAlert}>
                            <EChart height={200} option={{
                                tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                series: [{
                                    type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                    data: [
                                        { name: 'Elective',  value: elective,  itemStyle: { color: '#059669' } },
                                        { name: 'Emergency', value: emergency, itemStyle: { color: '#ea580c' } },
                                        { name: 'Day',       value: daySurg,   itemStyle: { color: '#0891b2' } },
                                    ].filter(d => d.value > 0),
                                    label: { show: false },
                                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
                                }],
                            }} />
                        </Section>

                        {/* Payer type */}
                        <Section title="By Payer Type" icon={Activity}>
                            {byPayer.length === 0 ? (
                                <EmptyState title="No payer data" description="Upload surgery CSV." />
                            ) : (
                                <EChart height={200} option={{
                                    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                    series: [{
                                        type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                        data: byPayer.map((d, i) => ({
                                            name: d.payer_type || 'Unknown',
                                            value: d.count,
                                            itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
                                        })),
                                        label: { show: false },
                                    }],
                                }} />
                            )}
                        </Section>
                    </div>
                )}

                {/* Top surgeons chart */}
                {!isLoading && bySurgeon.length > 0 && (
                    <Section title="Top Surgeons" icon={Star}>
                        <EChart height={220} option={{
                            grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: bySurgeon.slice(0, 10).map(d => (d.surgeon || '').split(' ').slice(0, 2).join(' ')), axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{
                                type: 'bar', barMaxWidth: 18,
                                label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                                data: bySurgeon.slice(0, 10).map((d, i) => ({
                                    value: d.count,
                                    itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] },
                                })),
                            }],
                        }} />
                    </Section>
                )}

                {/* Charts row 2 */}
                {!isLoading && (byOtRoom.length > 0 || byDept.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {byOtRoom.length > 0 && (
                            <Section title="OT Room Utilisation" icon={Activity}>
                                <EChart height={200} option={{
                                    grid: { top: 4, right: 50, bottom: 4, left: 4, containLabel: true },
                                    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                    yAxis: { type: 'category', data: byOtRoom.map(d => d.ot_name || 'Unknown'), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                    series: [{ type: 'bar', barMaxWidth: 16, label: { show: true, position: 'right', fontSize: 9, color: '#64748b' }, data: byOtRoom.map((d, i) => ({ value: d.count, itemStyle: { color: CHART_PALETTE[(i + 3) % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                                }} />
                            </Section>
                        )}
                        {byDept.length > 0 && (
                            <Section title="By Department" icon={Activity}>
                                <EChart height={200} option={{
                                    grid: { top: 4, right: 50, bottom: 4, left: 4, containLabel: true },
                                    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                    yAxis: { type: 'category', data: byDept.slice(0, 8).map(d => (d.dept || '').substring(0, 16)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                    series: [{ type: 'bar', barMaxWidth: 16, label: { show: true, position: 'right', fontSize: 9, color: '#64748b' }, data: byDept.slice(0, 8).map((d, i) => ({ value: d.count, itemStyle: { color: CHART_PALETTE[(i + 1) % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                                }} />
                            </Section>
                        )}
                    </div>
                )}

                {/* Surgeon table */}
                <Section title="Surgeon Performance Table" icon={Users}>
                    {isLoading ? <TableSkeleton rows={8} cols={4} /> : bySurgeon.length === 0 ? (
                        <EmptyState icon={Scissors} title="No surgery data" description="Upload surgery CSV to see analytics." />
                    ) : (
                        <DataTable data={bySurgeon} columns={SURGEON_COLS} pageSize={20} searchable emptyText="No surgeons match your search." />
                    )}
                </Section>

            </main>
        </AppLayout>
    );
}
