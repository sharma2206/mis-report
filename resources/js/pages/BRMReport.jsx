import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import {
    BarChart3, Download, RefreshCw, TrendingUp, Users, Stethoscope, Calendar,
    AlertCircle,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate, setBranch } from '../store/reportSlice';
import { analyticsApi, misApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES } from '../constants';
import { fmtL } from '../utils/formatters';
import { monthStart, resolvePresetRange, today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';
import { triggerDownload } from '../utils/download';
import { useBranches } from '../hooks/useBranches';

const brmColHelper = createColumnHelper();
const BRM_COLS = [
    brmColHelper.display({ id: 'rank', header: '#', cell: info => info.row.index + 1, enableSorting: false, meta: { className: 'w-8 text-center text-slate-400' } }),
    brmColHelper.accessor('doctor', { header: 'Doctor', cell: info => <span className="font-600">{info.getValue() || '—'}</span> }),
    brmColHelper.accessor('speciality', { header: 'Speciality', cell: info => <span className="text-slate-500">{info.getValue() || '—'}</span> }),
    brmColHelper.accessor('total_revenue', { header: 'Revenue', cell: info => <span className="font-700 text-blue-700 tabular-nums">{fmtL(info.getValue())}</span>, meta: { align: 'right' } }),
    brmColHelper.accessor('unique_patients', { header: 'Patients', cell: info => Number(info.getValue()).toLocaleString('en-IN'), meta: { align: 'right' } }),
    brmColHelper.accessor('op_revenue', { header: 'OP', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    brmColHelper.accessor('ip_revenue', { header: 'IP', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    brmColHelper.accessor('er_revenue', { header: 'ER', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
    brmColHelper.accessor('total_discount', { header: 'Discount', cell: info => fmtL(info.getValue()), meta: { align: 'right' } }),
];

const PALETTE = ['#1d4ed8','#7c3aed','#dc2626','#059669','#d97706','#0891b2','#9333ea','#ea580c'];

const TOOLTIP_STYLE = {
    borderRadius: 10, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px',
};



const PRESET_BTNS = [
    { label: 'Today',     key: 'today'      },
    { label: 'Yesterday', key: 'yesterday'  },
    { label: 'This Week', key: 'week'       },
    { label: 'MTD',       key: 'mtd'        },
];


export default function BRMReport() {
    const dispatch = useDispatch();
    const token    = useSelector(selectToken);
    const branch   = useSelector(selectBranch);
    const date     = useSelector(selectDate);
    const todayStr = today();
    const { branches } = useBranches();

    const [from, setFrom]       = useState(monthStart(date) || date);
    const [to,   setTo]         = useState(date);
    const [preset, setPreset]   = useState('mtd');
    const [exporting, setExp]   = useState(false);
    const [dlError,  setDlErr]  = useState(null);

    const applyPreset = (key) => {
        const r = resolvePresetRange(key);
        setFrom(r.from); setTo(r.to); setPreset(key);
    };

    const params = { branch, from, to };

    const { data: deptRaw, isLoading: loadDept  } = useQuery({
        queryKey: ['brm-dept',    branch, from, to],
        queryFn:  () => analyticsApi.deptRevenue(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const { data: perfRaw, isLoading: loadPerf  } = useQuery({
        queryKey: ['brm-perf',    branch, from, to],
        queryFn:  () => analyticsApi.doctorPerformance(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    if (!token) return <Navigate to="/login" replace />;

    const deptArr    = deptRaw?.success ? (deptRaw.data ?? []) : [];
    const doctors    = perfRaw?.success ? (perfRaw.data?.doctors ?? perfRaw.data ?? []) : [];

    const totalRev   = doctors.reduce((s, d) => s + (Number(d.total_revenue) || 0), 0);
    const totalPts   = doctors.reduce((s, d) => s + (Number(d.unique_patients) || 0), 0);

    const handleDownload = async () => {
        const branchShort = branch?.slice(0, 3).toUpperCase() || 'BRM';
        const f = from.replace(/-/g, ''); const t = to.replace(/-/g, '');
        setDlErr(null);
        await triggerDownload(
            () => misApi.exportBrm(branch, from, to),
            `BRM-${branchShort}-${f}-${t}.xlsx`,
            () => setExp(true),
            () => setExp(false),
            () => setDlErr('Export failed — no data found for this branch and date range.'),
        );
    };

    const branchLabel = BRANCHES[branch]?.label || branch;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[15px] font-700 text-slate-800">BRM Report</h1>
                    <p className="text-[11px] text-slate-400">{from} – {to}</p>
                </div>

                {/* Inline branch selector */}
                {branches.length > 1 && (
                    <div className="flex gap-1">
                        {branches.map(b => (
                            <button key={b.key} onClick={() => dispatch(setBranch(b.key))}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-[12px] font-600 border transition-all cursor-pointer',
                                    branch === b.key
                                        ? 'bg-sky-600 border-sky-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700',
                                )}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                )}
                {branches.length === 1 && (
                    <span className="px-3 py-1.5 rounded-lg text-[12px] font-600 bg-sky-50 text-sky-700 border border-sky-200">
                        {branchLabel}
                    </span>
                )}

                <button
                    onClick={handleDownload}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[12px] font-600 rounded-lg transition-all cursor-pointer disabled:opacity-60"
                >
                    {exporting
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Downloading…</>
                        : <><Download  className="w-3.5 h-3.5" /> Download BRM Excel</>}
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Download error */}
                {dlError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[12px]">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{dlError}</span>
                        <button onClick={() => setDlErr(null)} className="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
                    </div>
                )}

                {/* Date range selector */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESET_BTNS.map(b => (
                            <button key={b.key} onClick={() => applyPreset(b.key)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer',
                                    preset === b.key
                                        ? 'bg-sky-600 border-sky-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-700',
                                )}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">From</label>
                            <input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPreset(''); }}
                                className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-sky-400" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">To</label>
                            <input type="date" value={to} min={from} max={todayStr} onChange={e => { setTo(e.target.value); setPreset(''); }}
                                className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-sky-400" />
                        </div>
                    </div>
                </div>

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Active Doctors',  value: doctors.length,                        color: 'sky',    icon: Stethoscope },
                        { label: 'Total Revenue',   value: fmtL(totalRev),                        color: 'blue',   icon: TrendingUp  },
                        { label: 'Total Patients',  value: totalPts.toLocaleString('en-IN'),       color: 'violet', icon: Users       },
                        { label: 'Departments',     value: deptArr.length,                        color: 'emerald',icon: BarChart3   },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                            <div className={`text-[1.2rem] font-800 tabular-nums text-${color}-700`}>{value}</div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Doctor revenue chart */}
                    <Section title="Doctor Revenue (Top 10)" icon={Stethoscope}>
                        {loadPerf ? <ChartSkeleton /> : doctors.length === 0 ? (
                            <EmptyState title="No doctor data" description="Upload bill items CSV to see BRM data." />
                        ) : (
                            <EChart height={280} option={{
                                grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: doctors.slice(0, 10).map(d => (d.doctor || '').split(' ').slice(0, 2).join(' ')), axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', barMaxWidth: 20, label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' },
                                    data: doctors.slice(0, 10).map((d, i) => ({ value: (Number(d.total_revenue) / 100000).toFixed(2), itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                            }} />
                        )}
                    </Section>

                    {/* Department revenue chart */}
                    <Section title="Department Revenue" icon={BarChart3}>
                        {loadDept ? <ChartSkeleton /> : deptArr.length === 0 ? (
                            <EmptyState title="No department data" description="Upload bill items CSV to see department revenue." />
                        ) : (
                            <EChart height={280} option={{
                                grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: deptArr.slice(0, 10).map(d => (d.treating_department || '').substring(0, 18)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', barMaxWidth: 20, label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' },
                                    data: deptArr.slice(0, 10).map((d, i) => ({ value: (Number(d.revenue) / 100000).toFixed(2), itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                            }} />
                        )}
                    </Section>
                </div>

                {/* Doctor table */}
                <Section title="Doctor Summary Table" icon={Stethoscope}
                    action={
                        <button onClick={handleDownload} disabled={exporting}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-600 text-sky-700 border border-sky-200 bg-sky-50 rounded-lg hover:bg-sky-100 transition-all cursor-pointer disabled:opacity-60">
                            {exporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Download BRM
                        </button>
                    }
                >
                    {loadPerf ? <TableSkeleton rows={8} cols={5} /> : doctors.length === 0 ? (
                        <EmptyState title="No doctors found" description="Upload bill items CSV to see data." />
                    ) : (
                        <DataTable data={doctors} columns={BRM_COLS} pageSize={20} emptyText="No doctors match your search." />
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
