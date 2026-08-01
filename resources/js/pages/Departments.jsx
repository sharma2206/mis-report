import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import { Building2, TrendingUp, Users, Activity, Calendar, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES, CHART_PALETTE } from '../constants';
import { fmtL } from '../utils/formatters';
import { monthStart, today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';


const colHelper = createColumnHelper();

const TABLE_COLS = [
    colHelper.display({
        id: 'rank', header: '#',
        cell: info => <span className="text-slate-400 tabular-nums">{info.row.index + 1}</span>,
        enableSorting: false,
        meta: { className: 'w-8 text-center' },
    }),
    colHelper.accessor('treating_department', {
        header: 'Department',
        cell: info => <span className="font-600 text-slate-800">{info.getValue() || '—'}</span>,
        meta: { className: 'min-w-[160px]' },
    }),
    colHelper.accessor('revenue', {
        header: 'Revenue',
        cell: info => <span className="font-700 text-blue-700 tabular-nums">{fmtL(info.getValue())}</span>,
        meta: { align: 'right' },
    }),
    colHelper.accessor('revenue_share', {
        header: 'Share %',
        cell: info => (
            <div className="flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, parseFloat(info.getValue() || 0))}%` }} />
                </div>
                <span className="text-[12px] tabular-nums text-slate-600 w-10 text-right">{info.getValue()}%</span>
            </div>
        ),
        meta: { align: 'right', className: 'w-36' },
    }),
    colHelper.accessor('patients', {
        header: 'Patients',
        cell: info => Number(info.getValue() ?? 0).toLocaleString('en-IN'),
        meta: { align: 'right' },
    }),
    colHelper.accessor('transactions', {
        header: 'Transactions',
        cell: info => Number(info.getValue() ?? 0).toLocaleString('en-IN'),
        meta: { align: 'right' },
    }),
    colHelper.accessor('ip_admissions', {
        header: 'IP Adm.',
        cell: info => info.getValue() ?? '—',
        meta: { align: 'right' },
    }),
    colHelper.accessor('avg_revenue', {
        header: 'Avg/Patient',
        cell: info => info.getValue() ? fmtL(info.getValue()) : '—',
        meta: { align: 'right' },
    }),
];

export default function Departments() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);
    const todayStr = today();

    const [from,   setFrom]   = useState(() => monthStart(date) || date);
    const [to,     setTo]     = useState(date);

    const enabled = !!(branch && from && to);

    const deptQ = useQuery({
        queryKey: ['dept-revenue', branch, from, to],
        queryFn:  () => analyticsApi.deptRevenue({ branch, from, to }).then(r => r.data),
        enabled,
    });
    const admQ = useQuery({
        queryKey: ['admissions', branch, from, to],
        queryFn:  () => analyticsApi.admissions({ branch, from, to }).then(r => r.data),
        enabled,
    });

    if (!token) return <Navigate to="/login" replace />;

    const rawDepts   = deptQ.data?.success ? (deptQ.data.data ?? []) : [];
    const ipByDept   = admQ.data?.success  ? (admQ.data.data?.ip_by_dept ?? []) : [];
    const ipMap      = Object.fromEntries(ipByDept.map(d => [d.treating_department, Number(d.count)]));
    const totalRev   = rawDepts.reduce((s, d) => s + parseFloat(d.revenue || 0), 0);

    const depts = useMemo(() => rawDepts.map(d => ({
        ...d,
        revenue:       parseFloat(d.revenue || 0),
        patients:      parseInt(d.patients || 0),
        transactions:  parseInt(d.transactions || 0),
        ip_admissions: ipMap[d.treating_department] ?? 0,
        revenue_share: totalRev > 0 ? ((parseFloat(d.revenue || 0) / totalRev) * 100).toFixed(1) : '0.0',
        avg_revenue:   parseInt(d.patients || 0) > 0
            ? parseFloat(d.revenue || 0) / parseInt(d.patients || 0)
            : null,
    })), [rawDepts, ipMap, totalRev]);

    const top10 = depts.slice(0, 10).map(d => ({
        name:    (d.treating_department || '').substring(0, 22),
        revenue: d.revenue / 100000,
    }));

    const totalPts   = depts.reduce((s, d) => s + d.patients, 0);
    const topDept    = depts[0]?.treating_department || '—';
    const avgRevDept = depts.length > 0 ? totalRev / depts.length : 0;
    const isLoading  = deptQ.isLoading;

    const branchLabel = BRANCHES[branch]?.label || branch;

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Department Analytics</h1>
                    <p className="text-[11px] text-slate-400">{branchLabel} · {from} – {to}</p>
                </div>
                <button onClick={() => { deptQ.refetch(); admQ.refetch(); }}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', (deptQ.isFetching || admQ.isFetching) && 'animate-spin text-teal-600')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range selector */}
                <PageDateBar
                    from={from} to={to}
                    accentColor="teal"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={() => { deptQ.refetch(); admQ.refetch(); }}
                    isRefreshing={deptQ.isFetching || admQ.isFetching}
                />

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Active Departments', value: isLoading ? '—' : depts.length,                         color: 'teal'    },
                        { label: 'Total Revenue',      value: isLoading ? '—' : fmtL(totalRev),                       color: 'blue'    },
                        { label: 'Total Patients',     value: isLoading ? '—' : totalPts.toLocaleString('en-IN'),      color: 'violet'  },
                        { label: 'Avg Rev / Dept',     value: isLoading ? '—' : fmtL(avgRevDept),                     color: 'amber'   },
                    ].map(({ label, value, color }, i) => (
                        <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                            <div className={`text-[1.2rem] font-800 tabular-nums text-${color}-700`}>{value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Chart */}
                <Section title="Top Departments by Revenue" icon={TrendingUp}>
                    {isLoading ? <ChartSkeleton /> : top10.length === 0 ? (
                        <EmptyState icon={Building2} title="No department data" description="Upload bill items CSV to see department analytics." />
                    ) : (
                        <EChart height={260} option={{
                            grid: { top: 8, right: 80, bottom: 8, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: top10.map(d => d.name), axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{
                                type: 'bar', barMaxWidth: 20,
                                label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' },
                                data: top10.map((d, i) => ({
                                    value: d.revenue.toFixed(2),
                                    itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] },
                                })),
                            }],
                        }} />
                    )}
                </Section>

                {/* Pie chart + admission split */}
                {!isLoading && depts.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Section title="Revenue Distribution" icon={Activity}>
                            <EChart height={220} option={{
                                tooltip: { trigger: 'item', formatter: p => `${p.name}: ₹${(p.value / 100000).toFixed(2)}L (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                series: [{
                                    type: 'pie', radius: ['40%', '68%'], center: ['50%', '44%'],
                                    data: depts.slice(0, 8).map((d, i) => ({
                                        name: (d.treating_department || '').substring(0, 14),
                                        value: d.revenue,
                                        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
                                    })),
                                    label: { show: false },
                                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
                                }],
                            }} />
                        </Section>

                        <Section title="IP Admissions by Department" icon={Users}>
                            {admQ.isLoading ? <ChartSkeleton /> : ipByDept.length === 0 ? (
                                <EmptyState title="No admission data" description="Upload IP admissions CSV." />
                            ) : (
                                <EChart height={220} option={{
                                    grid: { top: 4, right: 60, bottom: 4, left: 4, containLabel: true },
                                    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                    yAxis: { type: 'category', data: ipByDept.slice(0, 8).map(d => (d.treating_department || '').substring(0, 18)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                    series: [{
                                        type: 'bar', barMaxWidth: 16,
                                        label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                                        data: ipByDept.slice(0, 8).map((d, i) => ({
                                            value: d.count,
                                            itemStyle: { color: CHART_PALETTE[(i + 2) % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] },
                                        })),
                                    }],
                                }} />
                            )}
                        </Section>
                    </div>
                )}

                {/* Table */}
                <Section title="Department Summary Table" icon={Building2}>
                    {isLoading ? <TableSkeleton rows={10} cols={7} /> : depts.length === 0 ? (
                        <EmptyState icon={Building2} title="No departments found" description="Upload bill items CSV to see department data." />
                    ) : (
                        <DataTable data={depts} columns={TABLE_COLS} pageSize={20} searchable emptyText="No departments match your search." />
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
