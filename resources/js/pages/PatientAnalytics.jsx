/**
 * PatientAnalytics — Demographics, repeat vs new, retention, age/gender breakdown.
 */
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import {
    Users, UserCheck, HeartPulse, BedDouble, Activity,
    BarChart3, TrendingUp, Calendar,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { GlobalFilterBar } from '../components/ui/GlobalFilterBar';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectGlobalFrom, selectGlobalTo } from '../store/reportSlice';
import { analyticsApi } from '../services/api';
import { ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { fmtL } from '../utils/formatters';
import { cn } from '../utils/cn';

const PAL = ['#1d4ed8','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#9333ea','#ea580c'];
const fmtCount = v => v == null ? '—' : Number(v).toLocaleString('en-IN');

const KPICard = ({ label, value, sub, color = 'blue', icon: Icon }) => {
    const colors = {
        blue:   'text-blue-700   bg-blue-50   border-blue-100',
        violet: 'text-violet-700 bg-violet-50 border-violet-100',
        green:  'text-emerald-700 bg-emerald-50 border-emerald-100',
        amber:  'text-amber-700  bg-amber-50  border-amber-100',
        red:    'text-red-700    bg-red-50    border-red-100',
    };
    const cls = colors[color] || colors.blue;
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border', cls)}>
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <div>
                    <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400">{label}</p>
                    <p className={cn('text-[1.2rem] font-800 tabular-nums mt-0.5', cls.split(' ')[0])}>{value ?? '—'}</p>
                    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
                </div>
            </div>
        </motion.div>
    );
};

const TOOLTIP = { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' };

export default function PatientAnalytics() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const gFrom  = useSelector(selectGlobalFrom);
    const gTo    = useSelector(selectGlobalTo);

    // Local date state — independent from global bar
    const [from, setFrom] = useState(gFrom);
    const [to,   setTo]   = useState(gTo);

    if (!token) return <Navigate to="/login" replace />;

    const params = { branch, from, to };

    const { data: ipRaw, isLoading: loadIp, refetch: rIp } = useQuery({
        queryKey: ['pat-ip', branch, from, to],
        queryFn:  () => analyticsApi.ipDemographics(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const { data: opRaw, isLoading: loadOp, refetch: rOp } = useQuery({
        queryKey: ['pat-op', branch, from, to],
        queryFn:  () => analyticsApi.opMetrics(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const { data: admRaw, isLoading: loadAdm, refetch: rAdm } = useQuery({
        queryKey: ['pat-adm', branch, from, to],
        queryFn:  () => analyticsApi.admissions(params).then(r => r.data),
        enabled:  !!(branch && from && to),
    });

    const ip  = ipRaw?.success  ? ipRaw.data  : null;
    const op  = opRaw?.success  ? opRaw.data  : null;
    const adm = admRaw?.success ? admRaw.data : null;

    const genderDist  = ip?.by_gender        ?? [];
    const ageGroups   = ip?.by_age_group     ?? [];
    const payerDist   = ip?.by_payer_type    ?? [];
    const wardDist    = ip?.by_ward          ?? [];
    const deptDist    = adm?.adm_by_dept     ?? [];
    const sourceDist  = adm?.adm_by_source   ?? [];

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Users className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h1 className="text-[15px] font-700 text-slate-800">Patient Analytics</h1>
                    <p className="text-[11px] text-slate-400">{from} – {to}</p>
                </div>
            </div>
        }>
            <GlobalFilterBar />
            <main className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range filter */}
                <PageDateBar
                    from={from} to={to}
                    accentColor="blue"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={() => { rIp(); rOp(); rAdm(); }}
                />

                {/* KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KPICard label="Total IP Patients"  value={fmtCount(ip?.total)}            sub="Admitted this period" color="blue"   icon={BedDouble}   />
                    <KPICard label="Total OP Visits"    value={fmtCount(op?.total_visits)}     sub="Outpatient visits"    color="green"  icon={Users}       />
                    <KPICard label="Avg LOS"            value={ip?.avg_los_days ? `${ip.avg_los_days}d` : '—'} sub="Avg length of stay" color="violet" icon={Calendar} />
                    <KPICard label="MLC Cases"          value={fmtCount(ip?.mlc_count)}        sub="Medico-legal cases"   color="red"    icon={HeartPulse}  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Gender donut */}
                    <Section title="Gender Distribution" icon={Users}>
                        {loadIp ? <ChartSkeleton /> : !genderDist.length ? (
                            <EmptyState title="No gender data" description="Upload IP admission CSV." />
                        ) : (
                            <EChart height={200} option={{
                                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...TOOLTIP },
                                series: [{ type: 'pie', radius: ['42%', '70%'],
                                    data: genderDist.map((r, i) => ({ name: r.gender, value: r.count, itemStyle: { color: PAL[i] } })),
                                    label: { formatter: '{b}\n{d}%', fontSize: 10 },
                                    itemStyle: { borderWidth: 2, borderColor: '#fff' },
                                }],
                            }} />
                        )}
                    </Section>

                    {/* Age group histogram */}
                    <Section title="Age Group Distribution" icon={UserCheck}>
                        {loadIp ? <ChartSkeleton /> : !ageGroups.length ? (
                            <EmptyState title="No age data" description="Upload IP admission CSV." />
                        ) : (
                            <EChart height={200} option={{
                                grid: { top: 8, right: 8, bottom: 24, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', ...TOOLTIP },
                                xAxis: { type: 'category', data: ageGroups.map(r => r.age_group || r.name),
                                    axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                series: [{ type: 'bar', barMaxWidth: 32,
                                    data: ageGroups.map((r, i) => ({ value: r.count ?? r.value, itemStyle: { color: PAL[i % PAL.length], borderRadius: [4, 4, 0, 0] } })),
                                    label: { show: true, position: 'top', fontSize: 9, color: '#64748b' },
                                }],
                            }} />
                        )}
                    </Section>

                    {/* Payer distribution */}
                    <Section title="Payer Type Distribution" icon={Activity}>
                        {loadIp ? <ChartSkeleton /> : !payerDist.length ? (
                            <EmptyState title="No payer data" description="Upload IP admission CSV." />
                        ) : (
                            <EChart height={200} option={{
                                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...TOOLTIP },
                                series: [{ type: 'pie', radius: ['42%', '70%'],
                                    data: payerDist.map((r, i) => ({ name: r.payer_type, value: r.count, itemStyle: { color: PAL[i] } })),
                                    label: { formatter: '{b}\n{d}%', fontSize: 10 },
                                    itemStyle: { borderWidth: 2, borderColor: '#fff' },
                                }],
                            }} />
                        )}
                    </Section>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Admissions by department */}
                    <Section title="Admissions by Department" icon={BedDouble}>
                        {loadAdm ? <ChartSkeleton /> : !deptDist.length ? (
                            <EmptyState title="No department data" description="Upload IP admission CSV." />
                        ) : (
                            <EChart height={Math.max(180, deptDist.length * 26)} option={{
                                grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', ...TOOLTIP },
                                xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: deptDist.map(r => r.treating_department),
                                    axisLabel: { fontSize: 9, color: '#64748b', width: 110, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', barMaxWidth: 18,
                                    data: deptDist.map((r, i) => ({ value: r.cnt, itemStyle: { color: PAL[i % PAL.length], borderRadius: [0, 4, 4, 0] } })),
                                    label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                                }],
                            }} />
                        )}
                    </Section>

                    {/* Admission source */}
                    <Section title="Admission Source / Referral" icon={TrendingUp}>
                        {loadAdm ? <ChartSkeleton /> : !sourceDist.length ? (
                            <EmptyState title="No source data" description="Upload IP admission CSV." />
                        ) : (
                            <EChart height={Math.max(180, sourceDist.slice(0, 10).length * 26)} option={{
                                grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
                                tooltip: { trigger: 'axis', ...TOOLTIP },
                                xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                yAxis: { type: 'category', data: sourceDist.slice(0, 10).map(r => r.admission_source),
                                    axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                                series: [{ type: 'bar', barMaxWidth: 18,
                                    data: sourceDist.slice(0, 10).map((r, i) => ({ value: r.cnt, itemStyle: { color: PAL[3 + i % PAL.length], borderRadius: [0, 4, 4, 0] } })),
                                    label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                                }],
                            }} />
                        )}
                    </Section>
                </div>

                {/* Ward census */}
                {wardDist.length > 0 && (
                    <Section title="Ward Census (Current IP)" icon={BedDouble}>
                        <EChart height={Math.max(160, wardDist.length * 26)} option={{
                            grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', ...TOOLTIP },
                            xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                            yAxis: { type: 'category', data: wardDist.slice(0, 15).map(r => r.ward),
                                axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{ type: 'bar', barMaxWidth: 18,
                                data: wardDist.slice(0, 15).map((r, i) => ({ value: r.count, itemStyle: { color: PAL[i % PAL.length], borderRadius: [0, 4, 4, 0] } })),
                                label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                            }],
                        }} />
                    </Section>
                )}
            </main>
        </AppLayout>
    );
}
