import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import EChart from '../components/ui/EChart';
import DataTable from '../components/ui/DataTable';
import {
    LayoutDashboard, BedDouble, UserPlus, Users, Activity, Building2,
    Stethoscope, TrendingUp, AlertTriangle, XCircle, Info, CheckCircle,
    RefreshCw, ChevronRight, Minus,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { PageDateBar } from '../components/ui/PageDateBar';
import { selectToken } from '../store/authSlice';
import { selectBranch, selectDate, selectGlobalFrom, selectGlobalTo } from '../store/reportSlice';
import { operationalApi } from '../services/api';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { BRANCHES } from '../constants';
import { fmtL } from '../utils/formatters';
import { cn } from '../utils/cn';

// ─── Palette ─────────────────────────────────────────────────────────────────

const PAL = ['#1d4ed8','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#9333ea','#ea580c','#0f766e','#be185d','#4f46e5','#65a30d'];

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview',    label: 'Overview',       icon: LayoutDashboard },
    { id: 'beds',        label: 'Bed Occupancy',  icon: BedDouble       },
    { id: 'admissions',  label: 'Admissions',     icon: UserPlus        },
    { id: 'census',      label: 'Census',         icon: Users           },
    { id: 'surgery',     label: 'Surgery & OT',   icon: Activity        },
    { id: 'departments', label: 'Departments',    icon: Building2       },
    { id: 'doctors',     label: 'Doctors',        icon: Stethoscope     },
    { id: 'analytics',   label: 'Analytics',      icon: TrendingUp      },
];

// ─── Shared UI helpers ────────────────────────────────────────────────────────


const KPICard = ({ label, value, sub, color = 'blue', icon: Icon, loading }) => {
    const colors = {
        blue:   'text-blue-700   bg-blue-50   border-blue-100',
        violet: 'text-violet-700 bg-violet-50 border-violet-100',
        green:  'text-emerald-700 bg-emerald-50 border-emerald-100',
        red:    'text-red-700    bg-red-50    border-red-100',
        amber:  'text-amber-700  bg-amber-50  border-amber-100',
        cyan:   'text-cyan-700   bg-cyan-50   border-cyan-100',
        indigo: 'text-indigo-700 bg-indigo-50 border-indigo-100',
        rose:   'text-rose-700   bg-rose-50   border-rose-100',
    };
    const cls = colors[color] ?? colors.blue;
    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            {loading ? (
                <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-6 bg-slate-100 rounded w-1/2 mt-1" />
                </div>
            ) : (
                <>
                    <div className="flex items-start gap-2.5">
                        {Icon && (
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border', cls)}>
                                <Icon className="w-4 h-4" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 truncate">{label}</p>
                            <p className={cn('text-[1.2rem] font-800 tabular-nums mt-0.5', cls.split(' ')[0])}>{value ?? '—'}</p>
                            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
};

const AlertCard = ({ alert }) => {
    const styles = {
        critical: { bg: 'bg-red-50 border-red-200',    icon: XCircle,       ic: 'text-red-600',    title: 'text-red-800',   msg: 'text-red-600'   },
        warning:  { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, ic: 'text-amber-600',  title: 'text-amber-800', msg: 'text-amber-600' },
        info:     { bg: 'bg-blue-50 border-blue-200',   icon: Info,          ic: 'text-blue-600',   title: 'text-blue-800',  msg: 'text-blue-600'  },
        success:  { bg: 'bg-green-50 border-green-200', icon: CheckCircle,   ic: 'text-green-600',  title: 'text-green-800', msg: 'text-green-600' },
    };
    const s = styles[alert.type] ?? styles.info;
    const AlertIcon = s.icon;
    return (
        <div className={cn('flex items-start gap-3 p-3 rounded-lg border', s.bg)}>
            <AlertIcon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', s.ic)} />
            <div className="min-w-0 flex-1">
                <p className={cn('text-[12px] font-700', s.title)}>{alert.title}</p>
                <p className={cn('text-[11px] mt-0.5', s.msg)}>{alert.message}</p>
            </div>
        </div>
    );
};

const GaugeChart = ({ pct, label }) => {
    const color = pct >= 90 ? '#dc2626' : pct >= 80 ? '#d97706' : pct >= 60 ? '#1d4ed8' : '#059669';
    return (
        <EChart height={200} option={{
            series: [{
                type: 'gauge',
                startAngle: 210, endAngle: -30,
                min: 0, max: 100,
                pointer: { show: false },
                progress: { show: true, overlap: false, roundCap: true, width: 16,
                    itemStyle: { color } },
                axisLine: { lineStyle: { width: 16, color: [[1, '#f1f5f9']] } },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                detail: {
                    valueAnimation: true, fontSize: 28, fontWeight: 700,
                    color, formatter: '{value}%', offsetCenter: [0, '10%'],
                },
                title: { fontSize: 11, color: '#94a3b8', offsetCenter: [0, '55%'] },
                data: [{ value: pct, name: label }],
            }],
        }} />
    );
};

// ─── Chart option helpers ────────────────────────────────────────────────────

const lineOpt = (days, series, title) => ({
    grid: { top: 32, right: 16, bottom: 24, left: 8, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.1)' },
    legend: { top: 4, textStyle: { fontSize: 10, color: '#64748b' } },
    xAxis: { type: 'category', data: days,
        axisLabel: { fontSize: 9, color: '#94a3b8', formatter: d => d?.slice(5) },
        axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' },
        axisLine: { show: false }, splitLine: { lineStyle: { color: '#f8fafc' } } },
    series: series.map((s, i) => ({
        name: s.name, type: 'line', smooth: true, data: s.data,
        lineStyle: { width: 2, color: PAL[i] },
        itemStyle: { color: PAL[i] },
        areaStyle: s.area ? { color: PAL[i], opacity: 0.08 } : undefined,
        symbol: 'circle', symbolSize: 4,
    })),
});

const hbarOpt = (labels, values, color, fmt) => ({
    grid: { top: 8, right: 70, bottom: 8, left: 8, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px',
        formatter: fmt ? p => `${p[0].name}: ${fmt(p[0].value)}` : undefined },
    xAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f8fafc' } } },
    yAxis: { type: 'category', data: labels,
        axisLabel: { fontSize: 9, color: '#64748b', width: 110, overflow: 'truncate' },
        axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', barMaxWidth: 18,
        label: { show: true, position: 'right', fontSize: 9, color: '#64748b',
            formatter: fmt ? p => fmt(p.value) : undefined },
        itemStyle: { color: color ?? PAL[0], borderRadius: [0, 4, 4, 0] },
        data: values }],
});

const pieOpt = (items, radius = ['40%', '70%']) => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)',
        backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
    legend: { orient: 'vertical', right: 4, top: 'center',
        textStyle: { fontSize: 10, color: '#64748b' } },
    series: [{
        type: 'pie', radius,
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: items.map((it, i) => ({
            name: it.name, value: it.value,
            itemStyle: { color: PAL[i % PAL.length] },
        })),
    }],
});

const stackedBarOpt = (days, series) => ({
    grid: { top: 32, right: 16, bottom: 24, left: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
    legend: { top: 4, textStyle: { fontSize: 10, color: '#64748b' } },
    xAxis: { type: 'category', data: days,
        axisLabel: { fontSize: 9, color: '#94a3b8', formatter: d => d?.slice(5) },
        axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' },
        axisLine: { show: false }, splitLine: { lineStyle: { color: '#f8fafc' } } },
    series: series.map((s, i) => ({
        name: s.name, type: 'bar', stack: 'total', barMaxWidth: 28,
        data: s.data, itemStyle: { color: PAL[i] },
        label: { show: false },
    })),
});

// ─── Column helpers ──────────────────────────────────────────────────────────

const deptColH   = createColumnHelper();
const doctorColH = createColumnHelper();
const surgColH   = createColumnHelper();

const DEPT_COLS = [
    deptColH.display({ id: 'rank', header: '#', cell: i => i.row.index + 1, meta: { className: 'w-8 text-center text-slate-400' }, enableSorting: false }),
    deptColH.accessor('department',       { header: 'Department', cell: i => <span className="font-600 text-[12px]">{i.getValue() || '—'}</span>, meta: { className: 'min-w-[140px]' } }),
    deptColH.accessor('revenue',          { header: 'Revenue',   cell: i => <span className="font-700 text-blue-700 tabular-nums">{fmtL(i.getValue())}</span>, meta: { align: 'right' } }),
    deptColH.accessor('patients',         { header: 'Patients',  cell: i => i.getValue()?.toLocaleString('en-IN'), meta: { align: 'right' } }),
    deptColH.accessor('current_patients', { header: 'Current IP', cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    deptColH.accessor('admissions',       { header: 'Admissions', cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    deptColH.accessor('discharges',       { header: 'Discharges', cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    deptColH.accessor('avg_los',          { header: 'Avg LOS', cell: i => i.getValue() != null ? i.getValue() + 'd' : '—', meta: { align: 'right' } }),
    deptColH.accessor('total_discount',   { header: 'Discount', cell: i => fmtL(i.getValue()), meta: { align: 'right' } }),
];

const DOCTOR_COLS = [
    doctorColH.display({ id: 'rank', header: '#', cell: i => i.row.index + 1, meta: { className: 'w-8 text-center text-slate-400' }, enableSorting: false }),
    doctorColH.accessor('doctor',           { header: 'Doctor',      cell: i => <span className="font-600 text-[12px]">{i.getValue() || '—'}</span>, meta: { className: 'min-w-[140px]' } }),
    doctorColH.accessor('department',       { header: 'Department',  cell: i => <span className="text-slate-500 text-[11px]">{i.getValue() || '—'}</span> }),
    doctorColH.accessor('revenue',          { header: 'Revenue',     cell: i => <span className="font-700 text-blue-700 tabular-nums">{fmtL(i.getValue())}</span>, meta: { align: 'right' } }),
    doctorColH.accessor('patients',         { header: 'Patients',    cell: i => i.getValue()?.toLocaleString('en-IN'), meta: { align: 'right' } }),
    doctorColH.accessor('current_patients', { header: 'Current IP',  cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    doctorColH.accessor('admissions',       { header: 'Admissions',  cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    doctorColH.accessor('discharges',       { header: 'Discharges',  cell: i => i.getValue() ?? '—', meta: { align: 'right' } }),
    doctorColH.accessor('avg_los',          { header: 'Avg LOS',     cell: i => i.getValue() != null ? i.getValue() + 'd' : '—', meta: { align: 'right' } }),
    doctorColH.accessor('ip_revenue',       { header: 'IP Rev',      cell: i => fmtL(i.getValue()), meta: { align: 'right' } }),
    doctorColH.accessor('op_revenue',       { header: 'OP Rev',      cell: i => fmtL(i.getValue()), meta: { align: 'right' } }),
];

const SURGEON_COLS = [
    surgColH.display({ id: 'rank', header: '#', cell: i => i.row.index + 1, meta: { className: 'w-8 text-center text-slate-400' }, enableSorting: false }),
    surgColH.accessor('performing_surgeon', { header: 'Surgeon',    cell: i => <span className="font-600 text-[12px]">{i.getValue() || '—'}</span>, meta: { className: 'min-w-[140px]' } }),
    surgColH.accessor('surgeon_department', { header: 'Department', cell: i => <span className="text-slate-500 text-[11px]">{i.getValue() || '—'}</span> }),
    surgColH.accessor('total',              { header: 'Total',      cell: i => i.getValue(), meta: { align: 'right' } }),
    surgColH.accessor('completed',          { header: 'Completed',  cell: i => <span className="text-emerald-700 font-600">{i.getValue()}</span>, meta: { align: 'right' } }),
    surgColH.accessor('emergency',          { header: 'Emergency',  cell: i => <span className="text-red-600 font-600">{i.getValue()}</span>, meta: { align: 'right' } }),
    surgColH.accessor('major',              { header: 'Major',      cell: i => i.getValue(), meta: { align: 'right' } }),
    surgColH.display({
        id: 'util', header: 'Utilization',
        cell: i => {
            const r = i.row.original;
            const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
            return (
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-600 text-slate-600 tabular-nums w-8 text-right">{pct}%</span>
                </div>
            );
        },
        meta: { className: 'min-w-[120px]' },
    }),
];

// ─── Tab panels ──────────────────────────────────────────────────────────────

function OverviewPanel({ kpis, alerts, loadKpis, loadAlerts }) {
    const k = kpis;
    return (
        <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <KPICard label="Current IP"       value={k?.current_ip}        sub={`Beds: ${k?.bed_count ?? '—'}`}       color="blue"   icon={BedDouble}    loading={loadKpis} />
                <KPICard label="Available Beds"   value={k?.available_beds}    sub={`${k?.occupancy_pct ?? '—'}% occupied`} color="green"  icon={BedDouble}    loading={loadKpis} />
                <KPICard label="Today Admissions" value={k?.today_admissions}  sub={`MTD: ${k?.mtd_admissions ?? '—'}`}   color="violet" icon={UserPlus}     loading={loadKpis} />
                <KPICard label="Today Discharges" value={k?.today_discharges}  sub={`MTD: ${k?.mtd_discharges ?? '—'}`}   color="cyan"   icon={ChevronRight}  loading={loadKpis} />
                <KPICard label="Today ER"         value={k?.today_er}          sub={`Current: ${k?.current_er ?? '—'}`}   color="red"    icon={Activity}     loading={loadKpis} />
                <KPICard label="Today OP"         value={k?.today_op}          sub="Unique patients"                       color="indigo" icon={Users}        loading={loadKpis} />
                <KPICard label="Today Surgeries"  value={k?.today_surgeries}   sub={`Completed: ${k?.surg_completed ?? '—'}`} color="amber" icon={Activity}  loading={loadKpis} />
                <KPICard label="Avg LOS"          value={k?.avg_los != null ? k.avg_los + 'd' : '—'} sub="MTD discharged" color="rose" icon={Minus}       loading={loadKpis} />
            </div>

            {/* Pending discharge warning */}
            {k?.pending_discharge > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-800 font-600">{k.pending_discharge} patients admitted 7+ days ago are still in-ward — review pending discharges</span>
                </div>
            )}

            {/* Alerts */}
            <Section title="Operational Alerts" icon={AlertTriangle}>
                {loadAlerts ? (
                    <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                    </div>
                ) : !alerts?.length ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-[12px] text-green-800 font-600">All systems normal — no active alerts</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                    </div>
                )}
            </Section>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard label="MTD Admissions"  value={k?.mtd_admissions}  color="blue"   icon={UserPlus}    loading={loadKpis} />
                <KPICard label="MTD Discharges"  value={k?.mtd_discharges}  color="violet" icon={ChevronRight} loading={loadKpis} />
                <KPICard label="MTD ER Cases"    value={k?.mtd_er}          color="red"    icon={Activity}    loading={loadKpis} />
                <KPICard label="MTD Surgeries"   value={k?.mtd_surgeries}   color="amber"  icon={Activity}    loading={loadKpis} />
            </div>
        </div>
    );
}

function BedsPanel({ bedData, kpis, load }) {
    const b = bedData;
    const k = kpis;

    const wardLabels  = useMemo(() => b?.ward_breakdown?.map(r => r.ward)     ?? [], [b]);
    const wardValues  = useMemo(() => b?.ward_breakdown?.map(r => r.occupied) ?? [], [b]);
    const roomLabels  = useMemo(() => b?.room_breakdown?.slice(0,12).map(r => r.room)     ?? [], [b]);
    const roomValues  = useMemo(() => b?.room_breakdown?.slice(0,12).map(r => r.occupied) ?? [], [b]);
    const trendDays   = useMemo(() => b?.adm_trend?.map(r => r.day) ?? [], [b]);
    const trendAdm    = useMemo(() => b?.adm_trend?.map(r => r.cnt) ?? [], [b]);
    const occDays     = useMemo(() => b?.occ_trend?.map(r => r.day) ?? [], [b]);
    const occValues   = useMemo(() => b?.occ_trend?.map(r => r.occupancy) ?? [], [b]);
    const occPctValues= useMemo(() => b?.occ_trend?.map(r => r.occupancy_pct) ?? [], [b]);

    return (
        <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard label="Total Beds"          value={k?.bed_count}                               color="blue"   icon={BedDouble} loading={load} />
                <KPICard label="Occupied Beds"       value={k?.current_ip}                              color="red"    icon={BedDouble} loading={load} />
                <KPICard label="Available Beds"      value={k?.available_beds}                          color="green"  icon={BedDouble} loading={load} />
                <KPICard label="Occupancy %"         value={k?.occupancy_pct != null ? k.occupancy_pct + '%' : '—'} color="violet" icon={TrendingUp} loading={load} />
                <KPICard label="Avg LOS (MTD)"       value={b?.avg_los != null ? b.avg_los + 'd' : '—'} color="amber"  icon={Minus}    loading={load} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard label="Discharged Today"    value={b?.discharged_today}    color="cyan"  icon={ChevronRight} loading={load} />
                <KPICard label="MTD Discharges"      value={b?.mtd_discharges}      color="indigo" icon={ChevronRight} loading={load} />
                <KPICard label="Bed Turnover (MTD)"  value={b?.bed_turnover != null ? b.bed_turnover + 'x' : '—'} color="rose" icon={TrendingUp} loading={load} />
                <KPICard label="Expected Discharges" value={b?.expected_discharges} color="amber"  icon={AlertTriangle} loading={load} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Gauge */}
                <Section title="Bed Occupancy" icon={BedDouble}>
                    {load ? <ChartSkeleton /> : (
                        <GaugeChart pct={k?.occupancy_pct ?? 0} label="Occupancy" />
                    )}
                </Section>

                {/* Ward breakdown */}
                <Section title="Ward-wise Occupancy" icon={BedDouble} className="lg:col-span-2">
                    {load ? <ChartSkeleton /> : wardLabels.length === 0 ? (
                        <EmptyState title="No ward data" description="Ward breakdown requires IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(160, wardLabels.length * 28)} option={hbarOpt(wardLabels, wardValues, PAL[0])} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Room type */}
                <Section title="Room Type Occupancy" icon={BedDouble}>
                    {load ? <ChartSkeleton /> : roomLabels.length === 0 ? (
                        <EmptyState title="No room data" description="Room breakdown requires IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(160, roomLabels.length * 26)} option={hbarOpt(roomLabels, roomValues, PAL[1])} />
                    )}
                </Section>

                {/* Discharge type */}
                <Section title="Discharge Type Distribution" icon={ChevronRight}>
                    {load ? <ChartSkeleton /> : !b?.dis_type_dist?.length ? (
                        <EmptyState title="No discharge data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={220} option={pieOpt(b.dis_type_dist.map(r => ({ name: r.discharge_type, value: r.cnt })))} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Admission trend */}
                <Section title="Admission Trend (14 days)" icon={TrendingUp}>
                    {load ? <ChartSkeleton /> : !trendDays.length ? (
                        <EmptyState title="No trend data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={200} option={lineOpt(trendDays, [{ name: 'Admissions', data: trendAdm, area: true }])} />
                    )}
                </Section>

                {/* Occupancy trend */}
                <Section title="Occupancy Trend (14 days)" icon={TrendingUp}>
                    {load ? <ChartSkeleton /> : !occDays.length ? (
                        <EmptyState title="No occupancy trend" description="Upload MIS report to see occupancy trend." />
                    ) : (
                        <EChart height={200} option={lineOpt(occDays, [
                            { name: 'Occupied Beds', data: occValues, area: true },
                            { name: 'Occupancy %', data: occPctValues },
                        ])} />
                    )}
                </Section>
            </div>
        </div>
    );
}

function AdmissionsPanel({ admData, kpis, load }) {
    const a = admData;
    const k = kpis;

    const mergedDays = useMemo(() => {
        const s = new Set([
            ...(a?.adm_trend?.map(r => r.day) ?? []),
            ...(a?.dis_trend?.map(r => r.day) ?? []),
            ...(a?.er_trend?.map(r => r.day)  ?? []),
        ]);
        return [...s].sort();
    }, [a]);

    const admMap = useMemo(() => Object.fromEntries((a?.adm_trend ?? []).map(r => [r.day, r.admissions])), [a]);
    const disMap = useMemo(() => Object.fromEntries((a?.dis_trend ?? []).map(r => [r.day, r.discharges])), [a]);
    const erMap  = useMemo(() => Object.fromEntries((a?.er_trend  ?? []).map(r => [r.day, r.er_count])),  [a]);

    return (
        <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard label="Today Admissions"  value={k?.today_admissions} sub={`MTD: ${k?.mtd_admissions ?? '—'}`}  color="blue"   icon={UserPlus}    loading={load} />
                <KPICard label="Today Discharges"  value={k?.today_discharges} sub={`MTD: ${k?.mtd_discharges ?? '—'}`}  color="violet" icon={ChevronRight} loading={load} />
                <KPICard label="Today ER"          value={k?.today_er}         sub={`MTD: ${k?.mtd_er ?? '—'}`}          color="red"    icon={Activity}    loading={load} />
                <KPICard label="High Risk / MLC"   value={`${a?.high_risk ?? '—'} / ${a?.mlc_cases ?? '—'}`} sub="MTD period" color="rose" icon={AlertTriangle} loading={load} />
            </div>

            {/* Combined trend */}
            <Section title="Admission / Discharge / ER Trend" icon={TrendingUp}>
                {load ? <ChartSkeleton /> : !mergedDays.length ? (
                    <EmptyState title="No trend data" description="Upload IP and ER admission CSVs." />
                ) : (
                    <EChart height={240} option={lineOpt(mergedDays, [
                        { name: 'Admissions', data: mergedDays.map(d => admMap[d] ?? 0), area: true },
                        { name: 'Discharges', data: mergedDays.map(d => disMap[d] ?? 0) },
                        { name: 'ER',         data: mergedDays.map(d => erMap[d]  ?? 0) },
                    ])} />
                )}
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Admission type */}
                <Section title="Admission Type" icon={UserPlus}>
                    {load ? <ChartSkeleton /> : !a?.adm_by_type?.length ? (
                        <EmptyState title="No admission type data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={220} option={pieOpt(a.adm_by_type.map(r => ({ name: r.admission_type, value: r.cnt })))} />
                    )}
                </Section>

                {/* Referral source */}
                <Section title="Referral / Admission Source" icon={ChevronRight}>
                    {load ? <ChartSkeleton /> : !a?.adm_by_source?.length ? (
                        <EmptyState title="No source data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={220}
                            option={hbarOpt(
                                a.adm_by_source.slice(0,10).map(r => r.admission_source),
                                a.adm_by_source.slice(0,10).map(r => r.cnt),
                                PAL[2]
                            )} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Admissions by dept */}
                <Section title="Admissions by Department" icon={Building2}>
                    {load ? <ChartSkeleton /> : !a?.adm_by_dept?.length ? (
                        <EmptyState title="No department data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(200, a.adm_by_dept.length * 26)}
                            option={hbarOpt(
                                a.adm_by_dept.map(r => r.treating_department),
                                a.adm_by_dept.map(r => r.cnt),
                                PAL[3]
                            )} />
                    )}
                </Section>

                {/* Payer distribution */}
                <Section title="Admissions by Payer" icon={Users}>
                    {load ? <ChartSkeleton /> : !a?.adm_by_payer?.length ? (
                        <EmptyState title="No payer data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={220} option={pieOpt(a.adm_by_payer.map(r => ({ name: r.payer_type, value: r.cnt })))} />
                    )}
                </Section>
            </div>
        </div>
    );
}

function CensusPanel({ censusData, kpis, load }) {
    const c = censusData;
    const k = kpis;

    const genderItems = useMemo(() =>
        (c?.gender_dist ?? []).map(r => ({ name: r.gender, value: r.cnt })), [c]);
    const payerItems  = useMemo(() =>
        (c?.payer_dist  ?? []).map(r => ({ name: r.payer_type, value: r.cnt })), [c]);
    const ageItems    = useMemo(() =>
        (c?.age_dist    ?? []).map(r => ({ name: r.age_group, value: r.cnt })), [c]);
    const cenDays     = useMemo(() => c?.daily_census?.map(r => r.day)    ?? [], [c]);
    const cenValues   = useMemo(() => c?.daily_census?.map(r => r.census) ?? [], [c]);

    return (
        <div className="space-y-4">
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard label="Current IP Census"  value={k?.current_ip}  color="blue"  icon={BedDouble}   loading={load} />
                <KPICard label="Current ER"         value={k?.current_er}  color="red"   icon={Activity}    loading={load} />
                <KPICard label="Bed Count"          value={k?.bed_count}   color="slate" icon={BedDouble}   loading={load} />
                <KPICard label="Wards Active"       value={c?.ward_census?.length} color="violet" icon={Building2} loading={load} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Gender */}
                <Section title="Gender Distribution" icon={Users}>
                    {load ? <ChartSkeleton /> : !genderItems.length ? (
                        <EmptyState title="No data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={200} option={pieOpt(genderItems)} />
                    )}
                </Section>

                {/* Age groups */}
                <Section title="Age Group Distribution" icon={Users}>
                    {load ? <ChartSkeleton /> : !ageItems.length ? (
                        <EmptyState title="No data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={200} option={hbarOpt(
                            ageItems.map(r => r.name), ageItems.map(r => r.value), PAL[4]
                        )} />
                    )}
                </Section>

                {/* Payer */}
                <Section title="Payer Distribution" icon={Users}>
                    {load ? <ChartSkeleton /> : !payerItems.length ? (
                        <EmptyState title="No data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={200} option={pieOpt(payerItems)} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Department census */}
                <Section title="Department Census (Current IP)" icon={Building2}>
                    {load ? <ChartSkeleton /> : !c?.dept_census?.length ? (
                        <EmptyState title="No department census" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(200, c.dept_census.length * 28)}
                            option={hbarOpt(
                                c.dept_census.map(r => r.treating_department),
                                c.dept_census.map(r => r.patients),
                                PAL[0]
                            )} />
                    )}
                </Section>

                {/* Ward census */}
                <Section title="Ward Census (Current IP)" icon={BedDouble}>
                    {load ? <ChartSkeleton /> : !c?.ward_census?.length ? (
                        <EmptyState title="No ward census" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(200, c.ward_census.length * 28)}
                            option={hbarOpt(
                                c.ward_census.map(r => r.ward),
                                c.ward_census.map(r => r.patients),
                                PAL[5]
                            )} />
                    )}
                </Section>
            </div>

            {/* Daily census trend */}
            <Section title="Daily Census Trend (14 days)" icon={TrendingUp}>
                {load ? <ChartSkeleton /> : !cenDays.length ? (
                    <EmptyState title="No census trend" description="Generate MIS Reports to build census history." />
                ) : (
                    <EChart height={200} option={lineOpt(cenDays, [{ name: 'Census', data: cenValues, area: true }])} />
                )}
            </Section>

            {/* Doctor census table */}
            <Section title="Doctor Census (Current Patients)" icon={Stethoscope}>
                {load ? <TableSkeleton rows={8} cols={3} /> : !c?.doctor_census?.length ? (
                    <EmptyState title="No doctor census" description="Upload IP admission CSV." />
                ) : (
                    <DataTable
                        data={c.doctor_census}
                        columns={[
                            createColumnHelper().display({ id: 'rank', header: '#', cell: i => i.row.index + 1, meta: { className: 'w-8 text-center text-slate-400' }, enableSorting: false }),
                            createColumnHelper().accessor('treating_doctor',     { header: 'Doctor',     cell: i => <span className="font-600 text-[12px]">{i.getValue() || '—'}</span> }),
                            createColumnHelper().accessor('treating_department', { header: 'Department', cell: i => <span className="text-slate-500 text-[11px]">{i.getValue() || '—'}</span> }),
                            createColumnHelper().accessor('patients',            { header: 'Patients',   cell: i => <span className="font-700 text-blue-700">{i.getValue()}</span>, meta: { align: 'right' } }),
                        ]}
                        pageSize={15}
                    />
                )}
            </Section>

            {/* Insurance / Corporate */}
            {c?.insurance_dist?.length > 0 && (
                <Section title="Insurance & Corporate Distribution" icon={Users}>
                    <EChart height={Math.max(160, c.insurance_dist.length * 26)}
                        option={hbarOpt(
                            c.insurance_dist.map(r => `${r.payer_name} (${r.payer_type})`),
                            c.insurance_dist.map(r => r.cnt),
                            PAL[6]
                        )} />
                </Section>
            )}
        </div>
    );
}

function SurgeryPanel({ surgData, kpis, load }) {
    const s = surgData;
    const t = s?.today ?? {};
    const m = s?.mtd   ?? {};

    const trendDays  = useMemo(() => s?.trend?.map(r => r.day) ?? [], [s]);
    const electiveD  = useMemo(() => s?.trend?.map(r => r.elective) ?? [], [s]);
    const emergencyD = useMemo(() => s?.trend?.map(r => r.emergency) ?? [], [s]);

    const otLabels   = useMemo(() => s?.ot_rooms?.map(r => r.ot_name)  ?? [], [s]);
    const otTotals   = useMemo(() => s?.ot_rooms?.map(r => r.total)    ?? [], [s]);
    const deptLabels = useMemo(() => s?.by_dept?.map(r => r.surgery_department) ?? [], [s]);
    const deptTotals = useMemo(() => s?.by_dept?.map(r => r.total)              ?? [], [s]);

    return (
        <div className="space-y-4">
            {/* Today KPIs */}
            <div>
                <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Today</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    <KPICard label="Total Cases"    value={t.total}              color="blue"   icon={Activity}      loading={load} />
                    <KPICard label="Completed"      value={t.completed}          color="green"  icon={CheckCircle}   loading={load} />
                    <KPICard label="Cancelled"      value={t.cancelled}          color="red"    icon={XCircle}       loading={load} />
                    <KPICard label="Postponed"      value={t.postponed}          color="amber"  icon={AlertTriangle} loading={load} />
                    <KPICard label="Emergency"      value={t.emergency}          color="rose"   icon={Activity}      loading={load} />
                    <KPICard label="Elective"       value={t.elective}           color="violet" icon={Activity}      loading={load} />
                    <KPICard label="Major"          value={t.major}              color="indigo" icon={Activity}      loading={load} />
                    <KPICard label="OT Utilization" value={t.utilization_pct != null ? t.utilization_pct + '%' : '—'} color="cyan" icon={TrendingUp} loading={load} />
                </div>
            </div>

            {/* MTD KPIs */}
            <div>
                <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Month-to-Date</p>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <KPICard label="MTD Total"        value={m.total}           color="blue"   icon={Activity}    loading={load} />
                    <KPICard label="MTD Completed"    value={m.completed}       color="green"  icon={CheckCircle} loading={load} />
                    <KPICard label="MTD Cancelled"    value={m.cancelled}       color="red"    icon={XCircle}     loading={load} />
                    <KPICard label="MTD Emergency"    value={m.emergency}       color="rose"   icon={Activity}    loading={load} />
                    <KPICard label="MTD Elective"     value={m.elective}        color="violet" icon={Activity}    loading={load} />
                    <KPICard label="MTD Utilization"  value={m.utilization_pct != null ? m.utilization_pct + '%' : '—'} color="cyan" icon={TrendingUp} loading={load} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* OT room utilization */}
                <Section title="OT Room Utilization (MTD)" icon={Activity}>
                    {load ? <ChartSkeleton /> : !otLabels.length ? (
                        <EmptyState title="No OT room data" description="Upload surgery CSV." />
                    ) : (
                        <EChart height={Math.max(180, otLabels.length * 30)}
                            option={hbarOpt(otLabels, otTotals, PAL[0])} />
                    )}
                </Section>

                {/* Surgery by dept */}
                <Section title="Surgeries by Department (MTD)" icon={Building2}>
                    {load ? <ChartSkeleton /> : !deptLabels.length ? (
                        <EmptyState title="No department data" description="Upload surgery CSV." />
                    ) : (
                        <EChart height={Math.max(180, deptLabels.length * 30)}
                            option={hbarOpt(deptLabels, deptTotals, PAL[3])} />
                    )}
                </Section>
            </div>

            {/* Surgery trend stacked */}
            <Section title="Surgery Trend — Elective vs Emergency (MTD)" icon={TrendingUp}>
                {load ? <ChartSkeleton /> : !trendDays.length ? (
                    <EmptyState title="No surgery trend" description="Upload surgery CSV." />
                ) : (
                    <EChart height={240} option={stackedBarOpt(trendDays, [
                        { name: 'Elective',  data: electiveD  },
                        { name: 'Emergency', data: emergencyD },
                    ])} />
                )}
            </Section>

            {/* Surgeon performance table */}
            <Section title="Surgeon Performance (MTD)" icon={Stethoscope}>
                {load ? <TableSkeleton rows={10} cols={7} /> : !s?.surgeons?.length ? (
                    <EmptyState title="No surgeon data" description="Upload surgery CSV." />
                ) : (
                    <DataTable data={s.surgeons} columns={SURGEON_COLS} pageSize={20} />
                )}
            </Section>
        </div>
    );
}

function DeptPanel({ deptData, load }) {
    const depts = deptData ?? [];

    const chartLabels = useMemo(() => depts.slice(0,12).map(d => d.department), [depts]);
    const chartRevs   = useMemo(() => depts.slice(0,12).map(d => (d.revenue / 100000).toFixed(2)), [depts]);
    const chartPats   = useMemo(() => depts.slice(0,12).map(d => d.patients), [depts]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue chart */}
                <Section title="Department Revenue (Top 12)" icon={TrendingUp}>
                    {load ? <ChartSkeleton /> : !chartLabels.length ? (
                        <EmptyState title="No department data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={Math.max(200, chartLabels.length * 28)}
                            option={hbarOpt(chartLabels, chartRevs, PAL[0], v => `₹${v}L`)} />
                    )}
                </Section>

                {/* Patient chart */}
                <Section title="Department Patient Volume (Top 12)" icon={Users}>
                    {load ? <ChartSkeleton /> : !chartLabels.length ? (
                        <EmptyState title="No department data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={Math.max(200, chartLabels.length * 28)}
                            option={hbarOpt(chartLabels, chartPats, PAL[5])} />
                    )}
                </Section>
            </div>

            {/* Full table */}
            <Section title="Department Operations Detail" icon={Building2}>
                {load ? <TableSkeleton rows={12} cols={8} /> : !depts.length ? (
                    <EmptyState title="No department data" description="Upload bill items CSV to see department operations." />
                ) : (
                    <DataTable data={depts} columns={DEPT_COLS} pageSize={25} searchable />
                )}
            </Section>
        </div>
    );
}

function DoctorPanel({ doctorData, load }) {
    const docs = doctorData ?? [];

    const top10    = useMemo(() => docs.slice(0, 10), [docs]);
    const chartLab = useMemo(() => top10.map(d => (d.doctor || '').split(' ').slice(0, 2).join(' ')), [top10]);
    const chartRev = useMemo(() => top10.map(d => (d.revenue / 100000).toFixed(2)), [top10]);
    const chartPat = useMemo(() => top10.map(d => d.patients), [top10]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Top 10 Doctors by Revenue" icon={TrendingUp}>
                    {load ? <ChartSkeleton /> : !chartLab.length ? (
                        <EmptyState title="No doctor data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={280}
                            option={hbarOpt(chartLab, chartRev, PAL[1], v => `₹${v}L`)} />
                    )}
                </Section>

                <Section title="Top 10 Doctors by Patient Volume" icon={Users}>
                    {load ? <ChartSkeleton /> : !chartLab.length ? (
                        <EmptyState title="No doctor data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={280}
                            option={hbarOpt(chartLab, chartPat, PAL[4])} />
                    )}
                </Section>
            </div>

            <Section title="Doctor Operations Detail" icon={Stethoscope}>
                {load ? <TableSkeleton rows={15} cols={9} /> : !docs.length ? (
                    <EmptyState title="No doctor data" description="Upload bill items CSV to see doctor operations." />
                ) : (
                    <DataTable data={docs} columns={DOCTOR_COLS} pageSize={25} searchable />
                )}
            </Section>
        </div>
    );
}

function AnalyticsPanel({ analyticsData, load }) {
    const a = analyticsData;

    const mergedDays = useMemo(() => {
        const s = new Set([
            ...(a?.adm_trend?.map(r => r.day)  ?? []),
            ...(a?.dis_trend?.map(r => r.day)  ?? []),
            ...(a?.er_trend?.map(r  => r.day)  ?? []),
            ...(a?.surg_trend?.map(r => r.day) ?? []),
        ]);
        return [...s].sort();
    }, [a]);

    const admMap  = useMemo(() => Object.fromEntries((a?.adm_trend  ?? []).map(r => [r.day, r.admissions])), [a]);
    const disMap  = useMemo(() => Object.fromEntries((a?.dis_trend  ?? []).map(r => [r.day, r.discharges])), [a]);
    const erMap   = useMemo(() => Object.fromEntries((a?.er_trend   ?? []).map(r => [r.day, r.er])),        [a]);
    const surgMap = useMemo(() => Object.fromEntries((a?.surg_trend ?? []).map(r => [r.day, r.surgeries])), [a]);

    const occDays  = useMemo(() => a?.occ_trend?.map(r => r.day) ?? [], [a]);
    const occVals  = useMemo(() => a?.occ_trend?.map(r => r.occupancy) ?? [], [a]);
    const occPcts  = useMemo(() => a?.occ_trend?.map(r => r.occupancy_pct) ?? [], [a]);

    const losDays  = useMemo(() => a?.los_trend?.map(r => r.day) ?? [], [a]);
    const losVals  = useMemo(() => a?.los_trend?.map(r => r.avg_los) ?? [], [a]);

    const deptLoadLabels = useMemo(() => a?.dept_load?.map(r => r.treating_department) ?? [], [a]);
    const deptLoadRevs   = useMemo(() => a?.dept_load?.map(r => (r.revenue / 100000).toFixed(2)) ?? [], [a]);

    const wardLabels = useMemo(() => a?.ward_occ?.map(r => r.ward)     ?? [], [a]);
    const wardVals   = useMemo(() => a?.ward_occ?.map(r => r.patients) ?? [], [a]);

    const drLabels = useMemo(() => a?.doctor_workload?.map(r => (r.treating_doctor || '').split(' ').slice(0,2).join(' ')) ?? [], [a]);
    const drPats   = useMemo(() => a?.doctor_workload?.map(r => r.patients) ?? [], [a]);

    const otLabels = useMemo(() => a?.ot_utilization?.map(r => r.ot_name) ?? [], [a]);
    const otTotals = useMemo(() => a?.ot_utilization?.map(r => r.total)   ?? [], [a]);
    const otComp   = useMemo(() => a?.ot_utilization?.map(r => r.completed) ?? [], [a]);

    return (
        <div className="space-y-4">
            {/* Patient flow */}
            <Section title="Patient Flow (Admissions · Discharges · ER · Surgery)" icon={TrendingUp}>
                {load ? <ChartSkeleton /> : !mergedDays.length ? (
                    <EmptyState title="No trend data" description="Upload IP admission, ER and surgery CSVs." />
                ) : (
                    <EChart height={260} option={lineOpt(mergedDays, [
                        { name: 'Admissions', data: mergedDays.map(d => admMap[d]  ?? 0), area: true },
                        { name: 'Discharges', data: mergedDays.map(d => disMap[d]  ?? 0) },
                        { name: 'ER',         data: mergedDays.map(d => erMap[d]   ?? 0) },
                        { name: 'Surgeries',  data: mergedDays.map(d => surgMap[d] ?? 0) },
                    ])} />
                )}
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Occupancy trend */}
                <Section title="Bed Occupancy Trend" icon={BedDouble}>
                    {load ? <ChartSkeleton /> : !occDays.length ? (
                        <EmptyState title="No occupancy history" description="Generate MIS reports to track occupancy." />
                    ) : (
                        <EChart height={220} option={lineOpt(occDays, [
                            { name: 'Beds Occupied', data: occVals, area: true },
                            { name: 'Occupancy %',   data: occPcts },
                        ])} />
                    )}
                </Section>

                {/* LOS trend */}
                <Section title="Average LOS Trend" icon={Minus}>
                    {load ? <ChartSkeleton /> : !losDays.length ? (
                        <EmptyState title="No LOS trend" description="Upload IP admission CSV with LOS data." />
                    ) : (
                        <EChart height={220} option={lineOpt(losDays, [{ name: 'Avg LOS (days)', data: losVals, area: true }])} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Department load */}
                <Section title="Department Revenue Load (Top 12)" icon={Building2}>
                    {load ? <ChartSkeleton /> : !deptLoadLabels.length ? (
                        <EmptyState title="No department data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={Math.max(200, deptLoadLabels.length * 26)}
                            option={hbarOpt(deptLoadLabels, deptLoadRevs, PAL[0], v => `₹${v}L`)} />
                    )}
                </Section>

                {/* Ward occupancy heatmap */}
                <Section title="Current Ward Occupancy" icon={BedDouble}>
                    {load ? <ChartSkeleton /> : !wardLabels.length ? (
                        <EmptyState title="No ward data" description="Upload IP admission CSV." />
                    ) : (
                        <EChart height={Math.max(200, wardLabels.length * 26)}
                            option={hbarOpt(wardLabels, wardVals, PAL[5])} />
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Doctor workload */}
                <Section title="Doctor Workload (Top 12 by Patients)" icon={Stethoscope}>
                    {load ? <ChartSkeleton /> : !drLabels.length ? (
                        <EmptyState title="No doctor data" description="Upload bill items CSV." />
                    ) : (
                        <EChart height={Math.max(200, drLabels.length * 26)}
                            option={hbarOpt(drLabels, drPats, PAL[1])} />
                    )}
                </Section>

                {/* OT utilization */}
                <Section title="OT Room Utilization" icon={Activity}>
                    {load ? <ChartSkeleton /> : !otLabels.length ? (
                        <EmptyState title="No OT data" description="Upload surgery CSV." />
                    ) : (
                        <EChart height={Math.max(200, otLabels.length * 40)} option={{
                            grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
                            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
                                backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
                                textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px' },
                            legend: { bottom: 0, textStyle: { fontSize: 10 } },
                            xAxis: { type: 'category', data: otLabels,
                                axisLabel: { fontSize: 9, color: '#94a3b8' },
                                axisLine: { show: false }, axisTick: { show: false } },
                            yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8' },
                                axisLine: { show: false }, splitLine: { lineStyle: { color: '#f8fafc' } } },
                            series: [
                                { name: 'Total',     type: 'bar', data: otTotals, barWidth: '40%', itemStyle: { color: PAL[7], borderRadius: [4,4,0,0] } },
                                { name: 'Completed', type: 'bar', data: otComp,   barWidth: '40%', itemStyle: { color: PAL[2], borderRadius: [4,4,0,0] } },
                            ],
                        }} />
                    )}
                </Section>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Operational() {
    const token  = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const date   = useSelector(selectDate);

    const [activeTab, setActiveTab] = useState('overview');
    const gFrom = useSelector(selectGlobalFrom);
    const gTo   = useSelector(selectGlobalTo);

    const [from, setFrom] = useState(gFrom);
    const [to,   setTo]   = useState(gTo);

    if (!token) return <Navigate to="/login" replace />;

    const dateParams = useMemo(() => ({ branch, date, from, to }), [branch, date, from, to]);
    const kpiParams  = useMemo(() => ({ branch, date }),           [branch, date]);

    // Always-on queries
    const { data: kpisRaw,   isLoading: loadKpis   } = useQuery({
        queryKey: ['op-kpis',   branch, date],
        queryFn:  () => operationalApi.kpis(kpiParams).then(r => r.data),
        enabled:  !!(branch && date),
    });
    const { data: alertsRaw, isLoading: loadAlerts  } = useQuery({
        queryKey: ['op-alerts', branch, date],
        queryFn:  () => operationalApi.alerts(kpiParams).then(r => r.data),
        enabled:  !!(branch && date),
        refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
    });

    // Tab-lazy queries
    const { data: bedRaw,    isLoading: loadBed     } = useQuery({
        queryKey: ['op-bed',   branch, date],
        queryFn:  () => operationalApi.bedOccupancy(kpiParams).then(r => r.data),
        enabled:  !!(branch && date) && ['beds', 'overview'].includes(activeTab),
    });
    const { data: admRaw,    isLoading: loadAdm     } = useQuery({
        queryKey: ['op-adm',   branch, from, to],
        queryFn:  () => operationalApi.admissions(dateParams).then(r => r.data),
        enabled:  !!(branch && date) && activeTab === 'admissions',
    });
    const { data: censusRaw, isLoading: loadCensus  } = useQuery({
        queryKey: ['op-census', branch, date],
        queryFn:  () => operationalApi.census(kpiParams).then(r => r.data),
        enabled:  !!(branch && date) && activeTab === 'census',
    });
    const { data: surgRaw,   isLoading: loadSurg    } = useQuery({
        queryKey: ['op-surg',  branch, from, to],
        queryFn:  () => operationalApi.surgery({ branch, date: to, from, to }).then(r => r.data),
        enabled:  !!(branch && (from || date)) && activeTab === 'surgery',
    });
    const { data: deptRaw,   isLoading: loadDept    } = useQuery({
        queryKey: ['op-dept',  branch, from, to],
        queryFn:  () => operationalApi.departments(dateParams).then(r => r.data),
        enabled:  !!(branch && date) && activeTab === 'departments',
    });
    const { data: docRaw,    isLoading: loadDoc     } = useQuery({
        queryKey: ['op-doc',   branch, from, to],
        queryFn:  () => operationalApi.doctors(dateParams).then(r => r.data),
        enabled:  !!(branch && date) && activeTab === 'doctors',
    });
    const { data: analyticsRaw, isLoading: loadAnalytics } = useQuery({
        queryKey: ['op-analytics', branch, from, to],
        queryFn:  () => operationalApi.analytics(dateParams).then(r => r.data),
        enabled:  !!(branch && date) && activeTab === 'analytics',
    });

    const kpis      = kpisRaw?.success      ? kpisRaw.data      : null;
    const alerts    = alertsRaw?.success    ? alertsRaw.data    : [];
    const bedData   = bedRaw?.success       ? bedRaw.data       : null;
    const admData   = admRaw?.success       ? admRaw.data       : null;
    const censData  = censusRaw?.success    ? censusRaw.data    : null;
    const surgData  = surgRaw?.success      ? surgRaw.data      : null;
    const deptData  = deptRaw?.success      ? deptRaw.data      : null;
    const docData   = docRaw?.success       ? docRaw.data       : null;
    const anData    = analyticsRaw?.success ? analyticsRaw.data : null;

    const branchLabel = BRANCHES[branch]?.label || branch;
    const activeTabDef = TABS.find(t => t.id === activeTab);

    return (
        <AppLayout topbar={
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[15px] font-700 text-slate-800">Operations Center</h1>
                    <p className="text-[11px] text-slate-400">{branchLabel} · {from} – {to}</p>
                </div>
                {alerts?.filter(a => a.type === 'critical').length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <span className="text-[11px] font-700 text-red-700">
                            {alerts.filter(a => a.type === 'critical').length} Critical
                        </span>
                    </div>
                )}
                {alerts?.filter(a => a.type === 'warning').length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span className="text-[11px] font-700 text-amber-700">
                            {alerts.filter(a => a.type === 'warning').length} Warnings
                        </span>
                    </div>
                )}
            </div>
        }>
            <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
                <PageDateBar
                    from={from} to={to}
                    accentColor="emerald"
                    onRange={({ from: f, to: t }) => { setFrom(f); setTo(t); }}
                    onRefresh={() => { }}
                    isRefreshing={false}
                />
                {/* Tab navigation */}
                <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => {
                            const TabIcon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-600 whitespace-nowrap border-b-2 transition-all cursor-pointer flex-shrink-0',
                                        activeTab === tab.id
                                            ? 'border-teal-600 text-teal-700 bg-teal-50/40'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                                    )}>
                                    <TabIcon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>


                {/* Tab content */}
                <div className="flex-1 p-4">
                    {activeTab === 'overview'    && <OverviewPanel  kpis={kpis} alerts={alerts} loadKpis={loadKpis} loadAlerts={loadAlerts} />}
                    {activeTab === 'beds'        && <BedsPanel       bedData={bedData} kpis={kpis} load={loadBed || loadKpis} />}
                    {activeTab === 'admissions'  && <AdmissionsPanel admData={admData} kpis={kpis} load={loadAdm || loadKpis} />}
                    {activeTab === 'census'      && <CensusPanel     censusData={censData} kpis={kpis} load={loadCensus || loadKpis} />}
                    {activeTab === 'surgery'     && <SurgeryPanel    surgData={surgData} kpis={kpis} load={loadSurg || loadKpis} />}
                    {activeTab === 'departments' && <DeptPanel       deptData={deptData} load={loadDept} />}
                    {activeTab === 'doctors'     && <DoctorPanel     doctorData={docData} load={loadDoc} />}
                    {activeTab === 'analytics'   && <AnalyticsPanel  analyticsData={anData} load={loadAnalytics} />}
                </div>
            </main>
        </AppLayout>
    );
}
