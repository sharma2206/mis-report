import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import { Pill, TrendingUp, ShoppingCart, Users, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate, selectGlobalFrom, selectGlobalTo } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES, CHART_PALETTE } from '../constants';
import { fmtL } from '../utils/formatters';
import { cn } from '../utils/cn';

const colHelper = createColumnHelper();

const ITEM_COLS = [
    colHelper.display({ id: 'rank', header: '#', cell: i => <span className="text-slate-400">{i.row.index + 1}</span>, enableSorting: false, meta: { className: 'w-8 text-center' } }),
    colHelper.accessor('service_item_name', { header: 'Item', cell: i => <span className="font-600 text-slate-800">{i.getValue() || '—'}</span>, meta: { className: 'min-w-[160px]' } }),
    colHelper.accessor('revenue',      { header: 'Revenue',    cell: i => <span className="font-700 text-blue-700 tabular-nums">{fmtL(i.getValue())}</span>, meta: { align: 'right' } }),
    colHelper.accessor('revenue_share',{ header: 'Share %',    cell: i => (
        <div className="flex items-center gap-2 justify-end">
            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, parseFloat(i.getValue() || 0))}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-slate-600 w-9 text-right">{i.getValue()}%</span>
        </div>
    ), meta: { align: 'right', className: 'w-32' } }),
    colHelper.accessor('quantity',     { header: 'Qty',        cell: i => Number(i.getValue() ?? 0).toLocaleString('en-IN'), meta: { align: 'right' } }),
    colHelper.accessor('transactions', { header: 'Txns',       cell: i => Number(i.getValue() ?? 0).toLocaleString('en-IN'), meta: { align: 'right' } }),
];

const PAYER_PHARMACY_TYPES = ['pharmacy', 'medicine', 'drug', 'pharmacy sale'];

export default function Pharmacy() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);
    const gFrom  = useSelector(selectGlobalFrom);
    const gTo    = useSelector(selectGlobalTo);

    // Local date state — independent from global bar
    const [from, setFrom] = useState(gFrom);
    const [to,   setTo]   = useState(gTo);

    const enabled = !!(branch && from && to);

    const { data: svcQ, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['service-revenue', branch, from, to],
        queryFn:  () => analyticsApi.serviceRevenue({ branch, from, to }).then(r => r.data),
        enabled,
    });

    if (!token) return <Navigate to="/login" replace />;

    const svcData    = svcQ?.success ? (svcQ?.data ?? {}) : {};
    const branchLabel = BRANCHES[branch]?.label || branch;

    // Pharmacy items: from top_items filtered by pharmacy service types, or all if no filter matches
    const allItems      = svcData.top_items ?? [];
    const byServiceType = svcData.by_service_type ?? [];
    const byPayerType   = svcData.by_payer_type ?? [];
    const byDept        = svcData.by_department ?? [];
    const byPatientType = svcData.by_patient_type ?? [];

    // Try to find pharmacy service type row
    const pharmacyRow = byServiceType.find(s =>
        PAYER_PHARMACY_TYPES.some(k => (s.service_type || '').toLowerCase().includes(k))
    );
    const totalRevenue   = svcData.total_revenue ?? 0;
    const totalDiscount  = svcData.total_discount ?? 0;
    const pharmRevenue   = pharmacyRow?.revenue ?? totalRevenue;
    const pharmTxns      = pharmacyRow?.transactions ?? (svcData.total_transactions ?? 0);

    // Enrich items with revenue share
    const items = useMemo(() => {
        const ref = pharmRevenue > 0 ? pharmRevenue : totalRevenue;
        return allItems.map(d => ({
            ...d,
            revenue:       parseFloat(d.revenue || 0),
            quantity:      parseInt(d.quantity || 0),
            transactions:  parseInt(d.transactions || 0),
            revenue_share: ref > 0 ? ((parseFloat(d.revenue || 0) / ref) * 100).toFixed(1) : '0.0',
        }));
    }, [allItems, pharmRevenue, totalRevenue]);

    const topItem = items[0]?.service_item_name || '—';

    const kpis = [
        { label: 'Total Revenue',      value: isLoading ? '—' : fmtL(pharmRevenue),                  color: 'green'  },
        { label: 'Top Item',           value: isLoading ? '—' : (topItem.length > 16 ? topItem.substring(0, 14) + '…' : topItem), color: 'blue'   },
        { label: 'Transactions',       value: isLoading ? '—' : Number(pharmTxns).toLocaleString('en-IN'), color: 'violet' },
        { label: 'Items Listed',       value: isLoading ? '—' : items.length,                         color: 'amber'  },
        { label: 'Total Discount',     value: isLoading ? '—' : fmtL(totalDiscount),                  color: 'red'    },
        { label: 'Service Types',      value: isLoading ? '—' : byServiceType.length,                 color: 'teal'   },
    ];

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-[15px] font-700 text-slate-800">Pharmacy Analytics</h1>
                    <p className="text-[11px] text-slate-400">{branchLabel} · {from} – {to}</p>
                </div>
                <button onClick={refetch}
                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-green-600')} />
                </button>
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range filter */}
                <PageDateBar
                    from={from} to={to}
                    accentColor="green"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={refetch}
                    isRefreshing={isFetching}
                />

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {kpis.map(({ label, value, color }, i) => (
                        <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                            <div className={`text-[1.1rem] font-800 tabular-nums text-${color}-700 truncate`}>{value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Charts */}
                {!isLoading && items.length > 0 && (
                    <Section title="Top 20 Items by Revenue" icon={TrendingUp}>
                        <EChart height={300} option={{
                            grid: { top: 8, right: 90, bottom: 8, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', valueFormatter: v => fmtL(v), backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8', formatter: v => `₹${(v/100000).toFixed(1)}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: items.slice(0, 20).map(d => (d.item_name || '').substring(0, 24)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{
                                type: 'bar', barMaxWidth: 16,
                                label: { show: true, position: 'right', formatter: p => fmtL(p.value), fontSize: 9, color: '#64748b' },
                                data: items.slice(0, 20).map((d, i) => ({
                                    value: d.revenue,
                                    itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] },
                                })),
                            }],
                        }} />
                    </Section>
                )}

                {/* Pies */}
                {!isLoading && (byPayerType.length > 0 || byServiceType.length > 0 || byPatientType.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {byPayerType.length > 0 && (
                            <Section title="By Payer Type" icon={Users}>
                                <EChart height={200} option={{
                                    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmtL(p.value)} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                    series: [{
                                        type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                        data: byPayerType.map((d, i) => ({
                                            name: d.payer_type || 'Unknown',
                                            value: parseFloat(d.revenue || 0),
                                            itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
                                        })),
                                        label: { show: false },
                                    }],
                                }} />
                            </Section>
                        )}
                        {byServiceType.length > 0 && (
                            <Section title="By Service Type" icon={ShoppingCart}>
                                <EChart height={200} option={{
                                    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmtL(p.value)} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                    series: [{
                                        type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                        data: byServiceType.map((d, i) => ({
                                            name: (d.service_type || 'Unknown').substring(0, 16),
                                            value: parseFloat(d.revenue || 0),
                                            itemStyle: { color: CHART_PALETTE[(i + 2) % CHART_PALETTE.length] },
                                        })),
                                        label: { show: false },
                                    }],
                                }} />
                            </Section>
                        )}
                        {byPatientType.length > 0 && (
                            <Section title="IP vs OP Revenue" icon={Users}>
                                <EChart height={200} option={{
                                    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmtL(p.value)} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
                                    series: [{
                                        type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'],
                                        data: byPatientType.map((d, i) => ({
                                            name: d.patient_type || 'Unknown',
                                            value: parseFloat(d.revenue || 0),
                                            itemStyle: { color: CHART_PALETTE[(i + 4) % CHART_PALETTE.length] },
                                        })),
                                        label: { show: false },
                                    }],
                                }} />
                            </Section>
                        )}
                    </div>
                )}

                {/* Revenue by department */}
                {!isLoading && byDept.length > 0 && (
                    <Section title="Revenue by Department" icon={TrendingUp}>
                        <EChart height={220} option={{
                            grid: { top: 4, right: 80, bottom: 4, left: 4, containLabel: true },
                            tooltip: { trigger: 'axis', valueFormatter: v => fmtL(v), backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8', formatter: v => `₹${(v/100000).toFixed(1)}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: byDept.slice(0, 10).map(d => (d.department || '').substring(0, 18)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{ type: 'bar', barMaxWidth: 16, label: { show: true, position: 'right', formatter: p => fmtL(p.value), fontSize: 9, color: '#64748b' }, data: byDept.slice(0, 10).map((d, i) => ({ value: parseFloat(d.revenue || 0), itemStyle: { color: CHART_PALETTE[(i + 5) % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
                        }} />
                    </Section>
                )}

                {/* Items table */}
                <Section title="Item-wise Revenue Table" icon={Pill}>
                    {isLoading ? <TableSkeleton rows={10} cols={6} /> : items.length === 0 ? (
                        <EmptyState icon={Pill} title="No pharmacy data" description="Upload service revenue CSV to see item analytics." />
                    ) : (
                        <DataTable data={items} columns={ITEM_COLS} pageSize={25} searchable emptyText="No items match your search." />
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
