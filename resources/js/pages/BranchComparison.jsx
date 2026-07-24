/**
 * BranchComparison — Side-by-side executive comparison of all branches.
 * Shows: Revenue, OP, IP, ER, Collection, Bed Occupancy, Surgeries ranking.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import {
    TrendingUp, TrendingDown, Minus,
    Trophy, Medal, BedDouble, Users, HeartPulse,
    Wallet, Scissors, CreditCard, Building2, BarChart3,
    RefreshCw, Sparkles,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { GlobalFilterBar } from '../components/ui/GlobalFilterBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectGlobalFrom, selectGlobalTo } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { ChartSkeleton } from '../components/ui/Skeleton';
import { fmtL } from '../utils/formatters';
import { cn } from '../utils/cn';
import { useBranches } from '../hooks/useBranches';

const PAL = ['#1d4ed8', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];

// ── helpers ─────────────────────────────────────────────────────────────────
const fmtCount = v => v == null ? '—' : Number(v).toLocaleString('en-IN');

const RankBadge = ({ rank, total }) => {
    if (rank === 1) return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-700">
            <Trophy className="w-3 h-3" /> Top
        </span>
    );
    if (rank === total) return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-700">
            <TrendingDown className="w-3 h-3" /> Low
        </span>
    );
    return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-700">
            <Medal className="w-3 h-3" /> #{rank}
        </span>
    );
};

const GrowthArrow = ({ pct }) => {
    if (!pct) return <Minus className="w-3.5 h-3.5 text-slate-300" />;
    return pct > 0
        ? <TrendingUp   className="w-3.5 h-3.5 text-emerald-500" />
        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
};

// ── Branch KPI Card ───────────────────────────────────────────────────────────
const BranchKPICard = ({ metric, branches, data, format, color, icon: Icon, rank }) => {
    const total  = branches.length;
    const maxVal = Math.max(...branches.map(b => data[b]?.current ?? 0));

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ background: `linear-gradient(135deg, ${PAL[0]}15, ${PAL[1]}15)`, borderBottom: '1px solid #e2e8f0' }}
            >
                {Icon && <Icon className="w-4 h-4 text-slate-600" />}
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-600">{metric}</span>
            </div>

            {/* Branch rows */}
            <div className="divide-y divide-slate-50">
                {branches.map((branch, i) => {
                    const val     = data[branch]?.current ?? 0;
                    const prev    = data[branch]?.previous;
                    const growth  = prev ? ((val - prev) / Math.abs(prev)) * 100 : null;
                    const barPct  = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    const r       = rank[branch];
                    const brLabel = branch.charAt(0).toUpperCase() + branch.slice(1);

                    const fmt = format === 'rupee' ? fmtL : fmtCount;

                    return (
                        <motion.div
                            key={branch}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="px-3 py-2.5"
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-700 flex-shrink-0"
                                        style={{ background: PAL[i % PAL.length] }}>
                                        {brLabel.charAt(0)}
                                    </div>
                                    <span className="text-[11px] font-700 text-slate-700">{brLabel}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <GrowthArrow pct={growth} />
                                    <span className={cn(
                                        'text-[12px] font-800 tabular-nums',
                                        r === 1 ? 'text-amber-700' : r === total ? 'text-red-600' : 'text-slate-700',
                                    )}>
                                        {fmt(val)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barPct}%` }}
                                        transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                                        className="h-full rounded-full"
                                        style={{ background: PAL[i % PAL.length] }}
                                    />
                                </div>
                                <RankBadge rank={r} total={total} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BranchComparison() {
    const token    = useSelector(selectToken);
    const from     = useSelector(selectGlobalFrom);
    const to       = useSelector(selectGlobalTo);
    const { branches } = useBranches();
    const branchKeys   = branches.map(b => b.key);

    // Fetch analytics for each branch in parallel
    const queries = branchKeys.map(b =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useQuery({
            queryKey:  ['branch-compare', b, from, to],
            queryFn:   () => analyticsApi.kpi(b, to).then(r => ({ branch: b, data: r.data?.data ?? {} })),
            enabled:   !!(b && from && to),
        })
    );

    // Fetch MIS for each branch
    const misQueries = branchKeys.map(b =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useQuery({
            queryKey:  ['branch-mis', b, to],
            queryFn:   () => import('../services/api').then(m => m.misApi.show(b, to)).then(r => ({ branch: b, data: r.data?.data ?? {} })),
            enabled:   !!(b && to),
        })
    );

    const isLoading = queries.some(q => q.isLoading) || misQueries.some(q => q.isLoading);

    if (!token) return <Navigate to="/login" replace />;

    // Build comparison dataset
    const kpiByBranch = useMemo(() => {
        const result = {};
        queries.forEach(q => {
            if (q.data?.branch) result[q.data.branch] = q.data.data;
        });
        return result;
    }, [queries]);

    const misByBranch = useMemo(() => {
        const result = {};
        misQueries.forEach(q => {
            if (q.data?.branch) result[q.data.branch] = q.data.data;
        });
        return result;
    }, [misQueries]);

    // Compute per-metric totals
    const getMetricData = (metric) => {
        const out = {};
        branchKeys.forEach(b => {
            const kpi = kpiByBranch[b] || {};
            const mis = misByBranch[b] || {};
            const ftdRev = mis?.sales?.ftd || {};
            const totalFtd = (Number(ftdRev.op) || 0) + (Number(ftdRev.ip) || 0) +
                              (Number(ftdRev.er) || 0) + (Number(ftdRev.ph) || 0);

            switch (metric) {
                case 'revenue':    out[b] = { current: totalFtd }; break;
                case 'collection': out[b] = { current: kpi.net_collection ?? 0 }; break;
                case 'op':         out[b] = { current: kpi.op_count ?? 0 }; break;
                case 'ip':         out[b] = { current: kpi.ip_count ?? 0 }; break;
                case 'er':         out[b] = { current: kpi.er_count ?? 0 }; break;
                case 'surgery':    out[b] = { current: kpi.surgery_count ?? 0 }; break;
                case 'occupancy':  out[b] = { current: kpi.bed_occupancy_pct ?? 0 }; break;
                case 'discount':   out[b] = { current: kpi.discount_amount ?? 0 }; break;
            }
        });
        return out;
    };

    // Compute ranking per metric
    const getRanking = (data) => {
        const sorted  = [...branchKeys].sort((a, b) => (data[b]?.current ?? 0) - (data[a]?.current ?? 0));
        const rankMap = {};
        sorted.forEach((b, i) => { rankMap[b] = i + 1; });
        return rankMap;
    };

    // Revenue chart data
    const revenueData = getMetricData('revenue');
    const chartLabels = branchKeys.map(b => b.charAt(0).toUpperCase() + b.slice(1));
    const chartRevs   = branchKeys.map(b => ((revenueData[b]?.current ?? 0) / 100000).toFixed(2));

    const radarIndicators = [
        { name: 'Revenue',    max: 100 },
        { name: 'OP Visits',  max: 100 },
        { name: 'Admissions', max: 100 },
        { name: 'Collection', max: 100 },
        { name: 'Surgeries',  max: 100 },
        { name: 'Occupancy',  max: 100 },
    ];

    const normalizeRadar = (branch) => {
        const metrics = {
            revenue:    getMetricData('revenue'),
            op:         getMetricData('op'),
            ip:         getMetricData('ip'),
            collection: getMetricData('collection'),
            surgery:    getMetricData('surgery'),
            occupancy:  getMetricData('occupancy'),
        };
        return [
            normalize(metrics.revenue,    branch),
            normalize(metrics.op,         branch),
            normalize(metrics.ip,         branch),
            normalize(metrics.collection, branch),
            normalize(metrics.surgery,    branch),
            normalize(metrics.occupancy,  branch),
        ];
    };

    function normalize(data, branch) {
        const vals = branchKeys.map(b => data[b]?.current ?? 0);
        const max  = Math.max(...vals, 1);
        return ((data[branch]?.current ?? 0) / max) * 100;
    }

    const metrics = [
        { key: 'revenue',    label: 'Total Revenue',   icon: TrendingUp,  format: 'rupee' },
        { key: 'collection', label: 'Net Collection',  icon: Wallet,      format: 'rupee' },
        { key: 'op',         label: 'OP Visits',       icon: Users,       format: 'count' },
        { key: 'ip',         label: 'Admissions',      icon: BedDouble,   format: 'count' },
        { key: 'er',         label: 'ER Patients',     icon: HeartPulse,  format: 'count' },
        { key: 'surgery',    label: 'Surgeries',       icon: Scissors,    format: 'count' },
    ];

    // Overall winner
    const revData = getMetricData('revenue');
    const winner  = branchKeys.reduce((a, b) => (revData[a]?.current ?? 0) >= (revData[b]?.current ?? 0) ? a : b, branchKeys[0]);

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[15px] font-700 text-slate-800">Branch Comparison</h1>
                    <p className="text-[11px] text-slate-400">{from} – {to} · {branchKeys.length} branches</p>
                </div>
                {winner && !isLoading && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        <div>
                            <p className="text-[10px] font-700 text-amber-500 uppercase tracking-wider">Top Revenue Branch</p>
                            <p className="text-[12px] font-800 text-amber-700 capitalize">{winner}</p>
                        </div>
                    </div>
                )}
                {isLoading && (
                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Loading…
                    </div>
                )}
            </div>
        }>
            <GlobalFilterBar />
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Revenue comparison bar chart */}
                <Section title="Revenue Comparison" icon={TrendingUp}>
                    {isLoading ? <ChartSkeleton /> : branchKeys.length === 0 ? (
                        <p className="text-[12px] text-slate-400 py-4 text-center">No branch data available.</p>
                    ) : (
                        <EChart height={220} option={{
                            grid:    { top: 16, right: 16, bottom: 32, left: 8, containLabel: true },
                            tooltip: {
                                trigger: 'axis',
                                backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
                                textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px',
                                formatter: p => `${p[0].name}: ₹${Number(p[0].value).toFixed(2)}L`,
                            },
                            xAxis: {
                                type: 'category', data: chartLabels,
                                axisLabel: { fontSize: 11, color: '#64748b', fontWeight: 600 },
                                axisLine: { show: false }, axisTick: { show: false },
                            },
                            yAxis: {
                                type: 'value',
                                axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` },
                                axisLine: { show: false }, splitLine: { lineStyle: { color: '#f8fafc' } },
                            },
                            series: [{
                                type: 'bar', barMaxWidth: 60,
                                data: chartRevs.map((v, i) => ({
                                    value: v,
                                    itemStyle: {
                                        color: {
                                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                            colorStops: [
                                                { offset: 0, color: PAL[i % PAL.length] },
                                                { offset: 1, color: PAL[i % PAL.length] + '80' },
                                            ],
                                        },
                                        borderRadius: [6, 6, 0, 0],
                                    },
                                    label: { show: true, position: 'top', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 10, color: '#64748b', fontWeight: 700 },
                                })),
                            }],
                        }} />
                    )}
                </Section>

                {/* Metric-by-metric comparison cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.map(({ key, label, icon, format }) => {
                        const data   = getMetricData(key);
                        const rankMap = getRanking(data);
                        return (
                            <BranchKPICard
                                key={key}
                                metric={label}
                                branches={branchKeys}
                                data={data}
                                format={format}
                                icon={icon}
                                rank={rankMap}
                            />
                        );
                    })}
                </div>

                {/* Radar chart comparison */}
                {branchKeys.length > 0 && (
                    <Section title="Performance Radar" icon={Sparkles}>
                        {isLoading ? <ChartSkeleton /> : (
                            <EChart height={340} option={{
                                tooltip: {
                                    trigger: 'item',
                                    backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
                                    textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px',
                                },
                                legend: {
                                    data: branchKeys.map(b => b.charAt(0).toUpperCase() + b.slice(1)),
                                    bottom: 4,
                                    textStyle: { fontSize: 11, color: '#64748b' },
                                },
                                radar: {
                                    indicator: radarIndicators,
                                    shape: 'circle',
                                    splitNumber: 4,
                                    name: { textStyle: { fontSize: 10, color: '#64748b', fontWeight: 700 } },
                                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                                    axisLine:  { lineStyle: { color: '#e2e8f0' } },
                                    splitArea: { show: false },
                                },
                                series: [{
                                    type: 'radar',
                                    data: branchKeys.map((b, i) => ({
                                        value: normalizeRadar(b),
                                        name:  b.charAt(0).toUpperCase() + b.slice(1),
                                        lineStyle: { width: 2, color: PAL[i % PAL.length] },
                                        itemStyle: { color: PAL[i % PAL.length] },
                                        areaStyle: { opacity: 0.08, color: PAL[i % PAL.length] },
                                        symbol: 'circle', symbolSize: 5,
                                    })),
                                }],
                            }} />
                        )}
                    </Section>
                )}

                {/* Summary table */}
                <Section title="Summary Table" icon={Building2}>
                    {isLoading ? (
                        <div className="animate-pulse space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-2 px-3 font-700 text-slate-500 text-[10px] uppercase tracking-wider">Branch</th>
                                        {metrics.map(m => (
                                            <th key={m.key} className="text-right py-2 px-3 font-700 text-slate-500 text-[10px] uppercase tracking-wider whitespace-nowrap">{m.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {branchKeys.map((b, bi) => (
                                        <tr key={b} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-700"
                                                        style={{ background: PAL[bi % PAL.length] }}>
                                                        {b.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-700 text-slate-700 capitalize">{b}</span>
                                                    {winner === b && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                                                </div>
                                            </td>
                                            {metrics.map(({ key, format }) => {
                                                const data    = getMetricData(key);
                                                const val     = data[b]?.current ?? 0;
                                                const rankMap = getRanking(data);
                                                const r       = rankMap[b];
                                                const fmt     = format === 'rupee' ? fmtL : fmtCount;
                                                return (
                                                    <td key={key} className="py-2.5 px-3 text-right">
                                                        <span className={cn(
                                                            'font-700 tabular-nums',
                                                            r === 1 ? 'text-amber-700' : r === branchKeys.length ? 'text-red-600' : 'text-slate-700',
                                                        )}>
                                                            {fmt(val)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
