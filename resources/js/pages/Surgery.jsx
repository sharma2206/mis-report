import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createColumnHelper } from '@tanstack/react-table';
import {
    Scissors, Activity, Users, RefreshCw, ShieldAlert, Star,
    Heart, Stethoscope, BarChart2, TrendingUp, AlertTriangle, Award, Calendar
} from 'lucide-react';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate } from '../store/reportSlice';
import { surgeryAnalyticsApi } from '../services/api';
import { CHART_PALETTE } from '../constants';
import { monthStart, today } from '../utils/dateHelpers';
import { cn } from '../utils/cn';

const col = createColumnHelper();

const TABS = [
    { id: 'overview',  label: 'Overview',        icon: BarChart2 },
    { id: 'surgeons',  label: 'Surgeons',         icon: Users },
    { id: 'ot',        label: 'OT Dashboard',     icon: Activity },
    { id: 'patient',   label: 'Patient & Quality',icon: Heart },
    { id: 'anaes',     label: 'Anaesthesia',      icon: Stethoscope },
    { id: 'payer',     label: 'Payer Analytics',  icon: Award },
];

const KPI_DEFS = [
    { key: 'total',       label: 'Total',        color: '#6366f1', icon: Scissors },
    { key: 'completed',   label: 'Completed',    color: '#10b981', icon: Activity },
    { key: 'cancelled',   label: 'Cancelled',    color: '#ef4444', icon: AlertTriangle },
    { key: 'emergency',   label: 'Emergency',    color: '#f59e0b', icon: ShieldAlert },
    { key: 'elective',    label: 'Elective',     color: '#3b82f6', icon: TrendingUp },
    { key: 'major',       label: 'Major',        color: '#dc2626', icon: Star },
    { key: 'minor',       label: 'Minor',        color: '#0891b2', icon: Star },
    { key: 'implant',     label: 'Implants',     color: '#8b5cf6', icon: Activity },
    { key: 'blood',       label: 'Blood Cases',  color: '#e11d48', icon: Heart },
    { key: 'avgDuration', label: 'Avg Duration', color: '#0284c7', icon: RefreshCw, unit: 'min' },
    { key: 'avgLos',      label: 'Avg LOS',      color: '#059669', icon: RefreshCw, unit: 'days' },
    { key: 'avgIcuLos',   label: 'Avg ICU LOS',  color: '#7c3aed', icon: RefreshCw, unit: 'days' },
];

function KpiCard({ label, value, color, icon: Icon, unit, loading }) {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-700 uppercase tracking-wider text-slate-400">{label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '1a' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
            </div>
            <div className="text-[1.4rem] font-800 tabular-nums" style={{ color }}>
                {loading ? <span className="text-slate-300">—</span> : <>{value ?? 0}{unit ? <span className="text-[0.7rem] ml-1 font-500 text-slate-400">{unit}</span> : ''}</>}
            </div>
        </motion.div>
    );
}

function InsightCard({ insight }) {
    const colors = { success: 'border-emerald-200 bg-emerald-50', warning: 'border-amber-200 bg-amber-50', info: 'border-blue-200 bg-blue-50' };
    return (
        <div className={`rounded-xl border p-3 flex gap-3 ${colors[insight.type] || colors.info}`}>
            <span className="text-xl">{insight.icon}</span>
            <div>
                <div className="text-[12px] font-700 text-slate-700">{insight.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{insight.text}</div>
            </div>
        </div>
    );
}

function DonutChart({ data, title, height = 200 }) {
    if (!data?.length) return <EmptyState title="No data" description="No records for this period." />;
    return (
        <EChart height={height} option={{
            tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value} (${p.percent}%)` },
            legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
            series: [{ type: 'pie', radius: ['36%', '62%'], center: ['50%', '42%'], label: { show: false },
                data: data.map((d, i) => ({ name: d.label, value: d.count, itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] } })) }],
        }} />
    );
}

function HBarChart({ data, xKey = 'count', yKey = 'label', height = 220 }) {
    if (!data?.length) return <EmptyState title="No data" description="No records." />;
    const items = [...data].slice(0, 12).reverse();
    return (
        <EChart height={height} option={{
            grid: { top: 4, right: 60, bottom: 4, left: 4, containLabel: true },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
            yAxis: { type: 'category', data: items.map(d => (d[yKey] || '').slice(0, 18)), axisLabel: { fontSize: 9, color: '#64748b' } },
            series: [{ type: 'bar', barMaxWidth: 18, label: { show: true, position: 'right', fontSize: 9, color: '#64748b' },
                data: items.map((d, i) => ({ value: d[xKey], itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length], borderRadius: [0, 4, 4, 0] } })) }],
        }} />
    );
}

const SURGEON_COLS = [
    col.display({ id: '#', header: '#', cell: i => <span className="text-slate-400 text-[11px]">{i.row.index + 1}</span>, meta: { className: 'w-8 text-center' } }),
    col.accessor('surgeon', { header: 'Surgeon', cell: i => <span className="font-600 text-slate-800 text-[12px]">{i.getValue() || '—'}</span> }),
    col.accessor('speciality', { header: 'Specialty', cell: i => <span className="text-slate-500 text-[11px]">{i.getValue() || '—'}</span> }),
    col.accessor('total', { header: 'Surgeries', cell: i => <span className="font-700 text-indigo-700">{i.getValue()}</span>, meta: { align: 'right' } }),
    col.accessor('major', { header: 'Major', cell: i => <span className="font-600 text-red-600">{i.getValue()}</span>, meta: { align: 'right' } }),
    col.accessor('emergency', { header: 'Emergency', cell: i => <span className="font-600 text-amber-600">{i.getValue()}</span>, meta: { align: 'right' } }),
    col.accessor('cancelled', { header: 'Cancelled', cell: i => <span className="text-slate-500">{i.getValue()}</span>, meta: { align: 'right' } }),
    col.accessor('avg_duration', { header: 'Avg Duration', cell: i => <span className="text-slate-600">{i.getValue() ? `${i.getValue()} min` : '—'}</span>, meta: { align: 'right' } }),
    col.accessor('avg_los', { header: 'Avg LOS', cell: i => <span className="text-slate-600">{i.getValue() ? `${i.getValue()}d` : '—'}</span>, meta: { align: 'right' } }),
    col.accessor('patients', { header: 'Patients', cell: i => <span className="text-slate-600">{i.getValue()}</span>, meta: { align: 'right' } }),
];

function OtHeatmap({ data }) {
    if (!data?.length) return <EmptyState title="No OT timing data" description="Surgery start timestamps required." />;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const map = {};
    data.forEach(d => { map[`${d.dow}-${d.hour}`] = d.count; });
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const heatData = [];
    data.forEach(d => heatData.push([d.hour, d.dow - 1, d.count]));
    return (
        <EChart height={220} option={{
            tooltip: { formatter: p => `${days[p.data[1]]} ${p.data[0]}:00 — ${p.data[2]} cases` },
            grid: { top: 10, right: 10, bottom: 30, left: 40 },
            xAxis: { type: 'category', data: hours.map(h => `${h}h`), axisLabel: { fontSize: 8, color: '#94a3b8' }, splitArea: { show: true } },
            yAxis: { type: 'category', data: days, axisLabel: { fontSize: 9, color: '#64748b' }, splitArea: { show: true } },
            visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: -5, textStyle: { fontSize: 9 }, inRange: { color: ['#eff6ff','#3b82f6','#1d4ed8'] } },
            series: [{ type: 'heatmap', data: heatData, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }],
        }} />
    );
}

export default function SurgeryDashboard() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);
    const todayStr = today();

    const [from,   setFrom]   = useState(() => monthStart(date) || date);
    const [to,     setTo]     = useState(date);

    const [activeTab, setActiveTab] = useState('overview');

    const p = useMemo(() => {
        const b = Array.isArray(branch) ? branch.join(',') : branch;
        return { branch: b, from, to };
    }, [branch, from, to]);

    const enabled = !!(p.branch && p.from && p.to);

    const kpiQ  = useQuery({ queryKey: ['sx-kpis',  p], queryFn: () => surgeryAnalyticsApi.kpis(p).then(r => r.data.data),  enabled, staleTime: 300000 });
    const distQ = useQuery({ queryKey: ['sx-dist',  p], queryFn: () => surgeryAnalyticsApi.distribution(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'overview' });
    const trendQ= useQuery({ queryKey: ['sx-trend', p], queryFn: () => surgeryAnalyticsApi.trend(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'overview' });
    const insQ  = useQuery({ queryKey: ['sx-ins',   p], queryFn: () => surgeryAnalyticsApi.insights(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'overview' });
    const surgQ = useQuery({ queryKey: ['sx-surg',  p], queryFn: () => surgeryAnalyticsApi.surgeonPerformance(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'surgeons' });
    const otQ   = useQuery({ queryKey: ['sx-ot',    p], queryFn: () => surgeryAnalyticsApi.otDashboard(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'ot' });
    const anaQ  = useQuery({ queryKey: ['sx-ana',   p], queryFn: () => surgeryAnalyticsApi.anaesthesia(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'anaes' });
    const patQ  = useQuery({ queryKey: ['sx-pat',   p], queryFn: () => surgeryAnalyticsApi.patientProfile(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'patient' });
    const qualQ = useQuery({ queryKey: ['sx-qual',  p], queryFn: () => surgeryAnalyticsApi.quality(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'patient' });
    const payQ  = useQuery({ queryKey: ['sx-pay',   p], queryFn: () => surgeryAnalyticsApi.payer(p).then(r => r.data.data), staleTime: 300000, enabled: enabled && activeTab === 'payer' });

    if (!token) return <Navigate to="/login" replace />;

    const kpis    = kpiQ.data  || {};
    const dist    = distQ.data || {};
    const trend   = trendQ.data|| {};
    const ins     = insQ.data  || [];
    const surgeons= surgQ.data?.surgeons || [];
    const ot      = otQ.data   || {};
    const ana     = anaQ.data?.distribution || [];
    const pat     = patQ.data  || {};
    const qual    = qualQ.data || {};
    const pay     = payQ.data  || {};

    const refetchAll = () => { kpiQ.refetch(); distQ.refetch(); trendQ.refetch(); insQ.refetch(); };
    const isLoading = kpiQ.isLoading;

    const topbar = (
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
                <h1 className="text-[15px] font-800 text-slate-800">Surgery Analytics</h1>
                <p className="text-[11px] text-slate-400">{p.from} – {p.to}</p>
            </div>
            <button onClick={refetchAll} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                <RefreshCw className={cn('w-3.5 h-3.5', kpiQ.isFetching && 'animate-spin text-red-500')} />
            </button>
        </div>
    );

    return (
        <AppLayout topbar={topbar}>
            {/* Tab Bar */}
            <div className="bg-white border-b border-slate-200 px-4 flex gap-1 flex-shrink-0 no-print">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={cn('flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-600 border-b-2 transition-colors whitespace-nowrap',
                            activeTab === tab.id ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                        <tab.icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Date range selector */}
                <PageDateBar
                    from={from} to={to}
                    accentColor="red"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={refetchAll}
                    isRefreshing={isLoading}
                />

                <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        {/* KPI Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {KPI_DEFS.map((d, i) => (
                                <KpiCard key={d.key} label={d.label} value={kpis[d.key]} color={d.color} icon={d.icon} unit={d.unit} loading={isLoading} />
                            ))}
                        </div>

                        {/* Insights */}
                        {ins.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {ins.slice(0, 4).map((insight, i) => <InsightCard key={i} insight={insight} />)}
                            </div>
                        )}

                        {/* Trend */}
                        {trend.daily?.length > 0 && (
                            <Section title="Daily Surgery Trend" icon={TrendingUp}>
                                <EChart height={220} option={{
                                    tooltip: { trigger: 'axis' },
                                    legend: { bottom: 0, textStyle: { fontSize: 10 } },
                                    grid: { top: 10, right: 10, bottom: 30, left: 10, containLabel: true },
                                    xAxis: { type: 'category', data: trend.daily.map(d => d.day), axisLabel: { fontSize: 9, color: '#94a3b8' }, boundaryGap: false },
                                    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                                    series: [
                                        { name: 'Total', type: 'line', smooth: true, data: trend.daily.map(d => d.total), areaStyle: { opacity: 0.1 }, itemStyle: { color: '#6366f1' }, lineStyle: { width: 2 } },
                                        { name: 'Major', type: 'line', smooth: true, data: trend.daily.map(d => d.major), itemStyle: { color: '#dc2626' }, lineStyle: { width: 1.5 } },
                                        { name: 'Emergency', type: 'line', smooth: true, data: trend.daily.map(d => d.emergency), itemStyle: { color: '#f59e0b' }, lineStyle: { width: 1.5 } },
                                    ],
                                }} />
                            </Section>
                        )}

                        {/* Distribution Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Section title="By Category"><DonutChart data={dist.by_category} /></Section>
                            <Section title="By Department"><HBarChart data={dist.by_department} /></Section>
                            <Section title="By Surgery Type"><DonutChart data={dist.by_surgery_type} /></Section>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Top Surgery Names" icon={Star}><HBarChart data={dist.top_surgery_names} /></Section>
                            <Section title="Top Diagnoses" icon={Stethoscope}><HBarChart data={dist.top_diagnoses} /></Section>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'surgeons' && (
                    <motion.div key="surgeons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        {surgQ.isLoading ? <TableSkeleton rows={10} cols={9} /> : surgeons.length === 0
                            ? <EmptyState icon={Users} title="No surgeon data" description="Upload surgery CSV to see analytics." />
                            : (
                                <>
                                    <Section title="Top 10 Surgeons by Volume" icon={Star}>
                                        <HBarChart data={surgeons.slice(0,10).map(s => ({ label: s.surgeon, count: s.total }))} height={260} />
                                    </Section>
                                    <Section title="Surgeon Performance Table" icon={Users}>
                                        <DataTable data={surgeons} columns={SURGEON_COLS} pageSize={25} searchable emptyText="No surgeons match." />
                                    </Section>
                                </>
                            )
                        }
                    </motion.div>
                )}

                {activeTab === 'ot' && (
                    <motion.div key="ot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Cases per OT Room" icon={Activity}>
                                <HBarChart data={(ot.by_ot || []).map(d => ({ label: d.ot, count: d.cases }))} height={240} />
                            </Section>
                            <Section title="Avg OT Duration (min)" icon={Activity}>
                                <HBarChart data={(ot.by_ot || []).map(d => ({ label: d.ot, count: d.avg_duration }))} height={240} />
                            </Section>
                        </div>
                        <Section title="Peak OT Usage Hours (Heatmap)" icon={Activity}>
                            <OtHeatmap data={ot.heatmap} />
                        </Section>
                        {ot.by_ot?.length > 0 && (
                            <Section title="OT Performance Table">
                                <DataTable data={ot.by_ot} columns={[
                                    col.accessor('ot', { header: 'OT Room', cell: i => <span className="font-600">{i.getValue()}</span> }),
                                    col.accessor('cases', { header: 'Cases', meta: { align: 'right' } }),
                                    col.accessor('avg_duration', { header: 'Avg Duration', cell: i => <>{i.getValue() || 0} min</>, meta: { align: 'right' } }),
                                    col.accessor('total_minutes', { header: 'Total Minutes', meta: { align: 'right' } }),
                                ]} pageSize={10} />
                            </Section>
                        )}
                    </motion.div>
                )}

                {activeTab === 'patient' && (
                    <motion.div key="patient" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { label: 'Blood Cases', value: pat.blood_required_count, color: '#e11d48' },
                                { label: 'Implant Cases', value: pat.implant_count, color: '#8b5cf6' },
                                { label: 'Avg LOS', value: pat.avg_los, color: '#0284c7', unit: 'd' },
                                { label: 'Avg ICU LOS', value: pat.avg_icu_los, color: '#7c3aed', unit: 'd' },
                            ].map(k => (
                                <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4">
                                    <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400">{k.label}</div>
                                    <div className="text-[1.4rem] font-800 mt-1" style={{ color: k.color }}>{k.value ?? 0}{k.unit}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Section title="By Gender"><DonutChart data={pat.by_gender} /></Section>
                            <Section title="By Age Group"><DonutChart data={pat.by_age_group} /></Section>
                            <Section title="By Blood Group"><DonutChart data={pat.by_blood_group} /></Section>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="PAC Status" icon={ShieldAlert}><DonutChart data={qual.pac_distribution} /></Section>
                            <Section title="Antibiotic Compliance" icon={ShieldAlert}><DonutChart data={qual.antibiotic_compliance} /></Section>
                        </div>
                        {qual.delayed_cases?.length > 0 && (
                            <Section title="Longest Duration Cases" icon={AlertTriangle}>
                                <DataTable data={qual.delayed_cases} columns={[
                                    col.accessor('patient_name', { header: 'Patient' }),
                                    col.accessor('surgery_name', { header: 'Surgery' }),
                                    col.accessor('surgery_date', { header: 'Date' }),
                                    col.accessor('performing_surgeon', { header: 'Surgeon' }),
                                    col.accessor('surgery_duration_min', { header: 'Duration (min)', meta: { align: 'right' } }),
                                ]} pageSize={10} />
                            </Section>
                        )}
                    </motion.div>
                )}

                {activeTab === 'anaes' && (
                    <motion.div key="anaes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Anaesthesia Type Distribution" icon={Stethoscope}><DonutChart data={ana} height={280} /></Section>
                            <Section title="Avg Duration by Anaesthesia Type" icon={Activity}>
                                <HBarChart data={ana.map(d => ({ label: d.label, count: d.avg_duration }))} height={280} />
                            </Section>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'payer' && (
                    <motion.div key="payer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Section title="By Payer Type"><DonutChart data={pay.by_payer_type} height={240} /></Section>
                            <Section title="By Billing Category"><DonutChart data={pay.by_billing_category} height={240} /></Section>
                            <Section title="Top Payer Names"><HBarChart data={pay.by_payer_name} height={240} /></Section>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </main>
        </AppLayout>
    );
}
