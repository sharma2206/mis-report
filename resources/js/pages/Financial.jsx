import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import {
    Wallet, TrendingUp, CreditCard, Users, BarChart3, PieChart as PieIcon, RefreshCw,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, setBranch, selectGlobalFrom, selectGlobalTo } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES } from '../constants';
import { fmtL, fmtRupee } from '../utils/formatters';
import { cn } from '../utils/cn';
import { useBranches } from '../hooks/useBranches';

const PALETTE = ['#1d4ed8', '#7c3aed', '#dc2626', '#059669', '#d97706', '#0891b2', '#9333ea', '#ea580c'];

const payerColHelper = createColumnHelper();
const makePayerCols = (payerArr) => {
    const total = payerArr.reduce((s, r) => s + Number(r.revenue || 0), 0);
    return [
        payerColHelper.accessor(row => row.payer_type || row.type || '—', {
            id: 'payer_type', header: 'Payer Type',
            cell: info => (
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[info.row.index % PALETTE.length] }} />
                    <span className="font-600 text-slate-700">{info.getValue()}</span>
                </div>
            ),
        }),
        payerColHelper.accessor('revenue', { header: 'Revenue', cell: info => <span className="font-700 tabular-nums">{fmtL(info.getValue())}</span>, meta: { align: 'right' } }),
        payerColHelper.accessor('patients', { header: 'Patients', cell: info => Number(info.getValue()).toLocaleString('en-IN'), meta: { align: 'right' } }),
        payerColHelper.display({
            id: 'avg', header: 'Avg/Patient',
            cell: info => { const r = info.row.original; return fmtL(r.patients > 0 ? r.revenue / r.patients : 0); },
            meta: { align: 'right' },
        }),
        payerColHelper.display({
            id: 'share', header: '% Share',
            cell: info => {
                const pct = total > 0 ? ((info.row.original.revenue / total) * 100) : 0;
                return (
                    <div className="flex items-center gap-1.5 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[info.row.index % PALETTE.length] }} />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8">{pct.toFixed(1)}%</span>
                    </div>
                );
            },
        }),
    ];
};

const TOOLTIP_STYLE = {
    borderRadius: 10, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px',
};


const KPICard = ({ label, value, sub, icon: Icon, color = 'blue' }) => {
    const colors = {
        blue:   { bg: 'bg-blue-600',   text: 'text-blue-700',   light: 'bg-blue-50'   },
        violet: { bg: 'bg-violet-600', text: 'text-violet-700', light: 'bg-violet-50' },
        green:  { bg: 'bg-emerald-600',text: 'text-emerald-700',light: 'bg-emerald-50'},
        amber:  { bg: 'bg-amber-600',  text: 'text-amber-700',  light: 'bg-amber-50'  },
    };
    const c = colors[color] || colors.blue;
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.light}`}>
                    {Icon && <Icon className={`w-4.5 h-4.5 ${c.text}`} />}
                </div>
                <div>
                    <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                    <p className={`text-[1.2rem] font-800 tabular-nums ${c.text}`}>{value}</p>
                    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
                </div>
            </div>
        </motion.div>
    );
};


export default function Financial() {
    const dispatch = useDispatch();
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const gFrom  = useSelector(selectGlobalFrom);
    const gTo    = useSelector(selectGlobalTo);
    const { branches } = useBranches();

    // Local date state — initialised from global, overridable per-page
    const [from, setFrom] = useState(gFrom);
    const [to,   setTo]   = useState(gTo);

    const params = { branch, from, to };

    const { data: collRaw,  isLoading: loadColl,  refetch: rColl,  isFetching: fColl  } = useQuery({
        queryKey: ['fin-collection', branch, from, to],
        queryFn:  () => analyticsApi.collection(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const { data: payerRaw, isLoading: loadPayer, refetch: rPayer, isFetching: fPayer } = useQuery({
        queryKey: ['fin-payer', branch, from, to],
        queryFn:  () => analyticsApi.payerMix(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const { data: svcRaw,   isLoading: loadSvc,   refetch: rSvc,   isFetching: fSvc   } = useQuery({
        queryKey: ['fin-service', branch, from, to],
        queryFn:  () => analyticsApi.serviceRevenue(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    if (!token) return <Navigate to="/login" replace />;

    const coll     = collRaw?.success  ? collRaw.data  : null;
    const payerArr = payerRaw?.success ? payerRaw.data : [];
    const svc      = svcRaw?.success   ? svcRaw.data   : null;

    const totalColl     = coll?.total_collection ?? 0;
    const byPatientType = coll?.by_patient_type ?? [];
    const byPaymentMode = coll?.payment_modes ?? [];

    const svcTotal = svc?.total_revenue ?? 0;
    const svcItems = svc?.by_service_type ?? [];
    const byDept   = svc?.by_department ?? [];

    const branchLabel = BRANCHES[branch]?.label || branch;
    const payerCols   = useMemo(() => makePayerCols(payerArr), [payerArr]);

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[15px] font-700 text-slate-800">Financial Reports</h1>
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
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
                                )}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                )}
                {branches.length === 1 && (
                    <span className="px-3 py-1.5 rounded-lg text-[12px] font-600 bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {branchLabel}
                    </span>
                )}
            </div>
        }>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range filter */}
                <PageDateBar
                    from={from} to={to}
                    accentColor="emerald"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={() => { rColl(); rPayer(); rSvc(); }}
                    isRefreshing={fColl || fPayer || fSvc}
                />

                {/* KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KPICard label="Total Collection"  value={fmtL(totalColl)} icon={Wallet}    color="blue"   />
                    <KPICard label="Total Revenue"     value={fmtL(svcTotal)}  icon={TrendingUp} color="violet" />
                    <KPICard label="Payer Types"       value={payerArr.length} icon={Users}      color="green"  />
                    <KPICard label="Service Categories" value={svcItems.length} icon={BarChart3}  color="amber"  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Collection by patient type */}
                    <Section title="Collection by Patient Type" icon={Wallet}>
                        {loadColl ? <ChartSkeleton /> : byPatientType.length === 0 ? (
                            <EmptyState title="No collection data" description="Upload cashier CSV to see collection breakdown." />
                        ) : (
                            <>
                                <EChart height={200} option={{
                                    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmtRupee(p.data?.raw ?? 0)} (${p.percent}%)`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                    series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '50%'],
                                        data: byPatientType.map((r, i) => ({ name: r.patient_type, value: (r.amount / 100000).toFixed(2), raw: r.amount, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
                                        label: { formatter: p => `${p.name}\n${p.percent}%`, fontSize: 10 }, itemStyle: { borderWidth: 2, borderColor: '#fff' } }],
                                }} />
                                <div className="space-y-1.5 mt-2">
                                    {byPatientType.map((row, i) => (
                                        <div key={row.patient_type} className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                                            <span className="text-[12px] text-slate-600 flex-1">{row.patient_type}</span>
                                            <span className="text-[12px] font-700 text-slate-800 tabular-nums">{fmtL(row.amount)}</span>
                                            <span className="text-[10px] text-slate-400 tabular-nums">{row.transactions} txn</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Section>

                    {/* Payment mode breakdown */}
                    <Section title="Collection by Payment Mode" icon={CreditCard}>
                        {loadColl ? <ChartSkeleton /> : byPaymentMode.length === 0 ? (
                            <EmptyState title="No payment mode data" description="Upload cashier CSV to see payment modes." />
                        ) : (
                            <EChart height={260} option={{
                                grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: byPaymentMode.map(r => r.mode || r.payment_mode), axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', data: byPaymentMode.map((r, i) => ({ value: (r.amount / 100000).toFixed(2), itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 20,
                                    label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' } }],
                            }} />
                        )}
                    </Section>

                    {/* Revenue by service type */}
                    <Section title="Revenue by Service Type" icon={TrendingUp}>
                        {loadSvc ? <ChartSkeleton /> : svcItems.length === 0 ? (
                            <EmptyState title="No service revenue data" description="Upload bill items CSV to see service revenue." />
                        ) : (
                            <div className="space-y-2">
                                {svcItems.slice(0, 10).map((row, i) => {
                                    const pct = svcTotal > 0 ? (row.revenue / svcTotal) * 100 : 0;
                                    return (
                                        <div key={row.service_type || i}>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] text-slate-600 flex-1 truncate">{row.service_type || '—'}</span>
                                                <span className="text-[11px] font-700 text-slate-800 tabular-nums">{fmtL(row.revenue)}</span>
                                                <span className="text-[10px] text-slate-400 w-8 text-right">{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>

                    {/* Revenue by department */}
                    <Section title="Revenue by Department" icon={PieIcon}>
                        {loadSvc ? <ChartSkeleton /> : byDept.length === 0 ? (
                            <EmptyState title="No department data" description="Upload bill items CSV to see department revenue." />
                        ) : (
                            <EChart height={260} option={{
                                grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                                xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: byDept.slice(0, 12).map(d => (d.department || '').substring(0, 20)), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', data: byDept.slice(0, 12).map((d, i) => ({ value: (d.revenue / 100000).toFixed(2), itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 20,
                                    label: { show: true, position: 'right', formatter: p => `₹${Number(p.value).toFixed(1)}L`, fontSize: 9, color: '#64748b' } }],
                            }} />
                        )}
                    </Section>
                </div>

                {/* Payer mix table */}
                <Section title="Payer Mix Analysis" icon={Users}>
                    {loadPayer ? <TableSkeleton rows={5} cols={4} /> : payerArr.length === 0 ? (
                        <EmptyState title="No payer data" description="Upload bill items CSV to see payer analysis." />
                    ) : (
                        <DataTable
                            data={payerArr}
                            columns={payerCols}
                            pageSize={20}
                            emptyText="No payer data."
                        />
                    )}
                </Section>
            </main>
        </AppLayout>
    );
}
