import { useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import EChart from '../components/ui/EChart';
import {
    RefreshCw, Download, FileSpreadsheet, FileText, Table2,
    Mail, Printer, ChevronLeft, ChevronRight, TrendingUp,
    TrendingDown, Minus, Building2, Calendar, BarChart3,
    DollarSign, Users, BedDouble, Activity, CreditCard,
    AlertCircle, CheckCircle2, X, Send,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { selectToken } from '../store/authSlice';
import { selectBranch as selBranch, selectDate as selDate, setBranch, setDate } from '../store/reportSlice';
import { misApi, analyticsApi } from '../services/api';
import { fmtL, fmtRupee, fmtPct, toLakhs, cfClass } from '../utils/formatters';
import { today, monthStart, shiftDate, formatDisplayDate } from '../utils/dateHelpers';
import { BRANCHES, CHART_PALETTE, DATE_PRESETS } from '../constants';
import { cn } from '../utils/cn';
import { TableSkeleton, ChartSkeleton, KPISkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

// ─── helpers ──────────────────────────────────────────────────────────────────
const todayStr = today();

const triggerDownload = async (fetchFn, filename, onStart, onEnd) => {
    onStart?.();
    try {
        const res = await fetchFn();
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = Object.assign(document.createElement('a'), { href: url, download: filename });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch {
        alert('Download failed — please try again.');
    } finally {
        onEnd?.();
    }
};

const fmtDateShort = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
};

const monthLabel = (date) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ─── Trend arrow ──────────────────────────────────────────────────────────────
const Trend = ({ ftd, mtd }) => {
    if (!ftd || !mtd) return null;
    const ftdL = toLakhs(ftd), mtdL = toLakhs(mtd);
    if (ftdL === 0 && mtdL === 0) return null;
    const daily = mtdL / (new Date().getDate() || 1);
    const diff  = ((ftdL - daily) / (daily || 1)) * 100;
    if (Math.abs(diff) < 1) return <Minus className="w-3 h-3 text-slate-400" />;
    return diff > 0
        ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-700"><TrendingUp className="w-3 h-3" />{diff.toFixed(0)}%</span>
        : <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-700"><TrendingDown className="w-3 h-3" />{Math.abs(diff).toFixed(0)}%</span>;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ label, ftd, mtd, Icon, color = 'blue', format = 'currency', skeleton }) => {
    if (skeleton) return <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse"><div className="h-3 bg-slate-200 rounded w-2/3 mb-3" /><div className="h-6 bg-slate-200 rounded w-1/2 mb-2" /><div className="h-3 bg-slate-100 rounded w-3/4" /></div>;
    const colorMap = {
        blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   val: 'text-blue-700'   },
        green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  val: 'text-green-700'  },
        violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600',val: 'text-violet-700' },
        amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  val: 'text-amber-700'  },
        red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      val: 'text-red-700'    },
        cyan:   { bg: 'bg-cyan-50',   icon: 'bg-cyan-100 text-cyan-600',    val: 'text-cyan-700'   },
    };
    const c = colorMap[color];
    const fmt = format === 'currency' ? fmtL : (v) => Number(v || 0).toLocaleString('en-IN');
    return (
        <div className={`bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-700 uppercase tracking-wider text-slate-400">{label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.icon}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <div className={`text-[22px] font-800 leading-none mb-1.5 ${c.val}`}>
                {fmt(ftd)}
            </div>
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">MTD <span className="font-600 text-slate-600">{fmt(mtd)}</span></span>
                <Trend ftd={ftd} mtd={mtd} />
            </div>
        </div>
    );
};

// ─── Revenue Section ──────────────────────────────────────────────────────────
const REV_ROWS = [
    { key: 'op', label: 'OP Revenue',  color: '#1d4ed8' },
    { key: 'ip', label: 'IP Revenue',  color: '#7c3aed' },
    { key: 'er', label: 'ER Revenue',  color: '#dc2626' },
    { key: 'ph', label: 'PH Revenue',  color: '#059669' },
];

const RevenueSection = ({ sales, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={8} cols={5} />;
    if (!sales) return <EmptyState title="No revenue data" />;
    const ftd = sales.ftd || {};
    const mtd = sales.mtd || {};
    const rows = REV_ROWS.filter(r => (ftd[r.key] || 0) > 0 || (mtd[r.key] || 0) > 0);
    const totalFtd = rows.reduce((s, r) => s + (Number(ftd[r.key]) || 0), 0);
    const totalMtd = rows.reduce((s, r) => s + (Number(mtd[r.key]) || 0), 0);

    return (
        <div className="space-y-4">
            {/* EChart bar */}
            <EChart height={180} option={{
                grid: { top: 12, right: 8, bottom: 24, left: 48, containLabel: true },
                tooltip: { trigger: 'axis', valueFormatter: v => `₹${Number(v).toFixed(2)}L`, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:8px' },
                legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 10, color: '#64748b' } },
                xAxis: { type: 'category', data: rows.map(r => r.label), axisLabel: { fontSize: 9, color: '#94a3b8' }, axisLine: { show: false }, axisTick: { show: false } },
                yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#94a3b8', formatter: v => `₹${v}L` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                series: [
                    { name: 'FTD', type: 'bar', data: rows.map(r => toLakhs(ftd[r.key])), barMaxWidth: 32, itemStyle: { borderRadius: [3,3,0,0], color: '#1d4ed8' } },
                    { name: 'MTD', type: 'bar', data: rows.map(r => toLakhs(mtd[r.key])), barMaxWidth: 32, itemStyle: { borderRadius: [3,3,0,0], color: '#e2e8f0' } },
                ],
            }} />

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b-2 border-slate-100">
                            <th className="pb-2 font-700">Category</th>
                            <th className="pb-2 text-right font-700">FTD (₹)</th>
                            <th className="pb-2 text-right font-700">FTD (L)</th>
                            <th className="pb-2 text-right font-700">MTD (L)</th>
                            <th className="pb-2 text-right font-700 hidden sm:table-cell">MTD %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, label, color }) => {
                            const ftdPct = totalMtd > 0 ? ((mtd[key] || 0) / totalMtd * 100).toFixed(1) : '—';
                            return (
                                <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                    <td className="py-2 font-500 text-slate-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                        {label}
                                    </td>
                                    <td className={`py-2 text-right font-600 tabular-nums ${cfClass(toLakhs(ftd[key]))}`}>{fmtRupee(ftd[key])}</td>
                                    <td className={`py-2 text-right font-700 tabular-nums ${cfClass(toLakhs(ftd[key]))}`}>{fmtL(ftd[key])}</td>
                                    <td className="py-2 text-right font-600 text-slate-500 tabular-nums">{fmtL(mtd[key])}</td>
                                    <td className="py-2 text-right text-slate-400 tabular-nums hidden sm:table-cell">{ftdPct}%</td>
                                </tr>
                            );
                        })}
                        <tr className="font-700 bg-slate-50 border-t-2 border-slate-200 text-[13px]">
                            <td className="py-2.5 text-slate-800">Total Revenue</td>
                            <td className={`py-2.5 text-right tabular-nums ${cfClass(toLakhs(totalFtd))}`}>{fmtRupee(totalFtd)}</td>
                            <td className={`py-2.5 text-right tabular-nums ${cfClass(toLakhs(totalFtd))}`}>{fmtL(totalFtd)}</td>
                            <td className="py-2.5 text-right text-slate-600 tabular-nums">{fmtL(totalMtd)}</td>
                            <td className="py-2.5 text-right text-slate-500 tabular-nums hidden sm:table-cell">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Collection Section ───────────────────────────────────────────────────────
const COLL_ROWS = [
    { key: 'op', label: 'OP Collection',       color: '#1d4ed8' },
    { key: 'ip', label: 'IP Collection',       color: '#7c3aed' },
    { key: 'er', label: 'ER Collection',       color: '#dc2626' },
    { key: 'ph', label: 'Pharmacy Collection', color: '#059669' },
];

const CollectionSection = ({ collection, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={7} cols={4} />;
    if (!collection) return <EmptyState title="No collection data" />;
    const ftd = collection.ftd || {};
    const mtd = collection.mtd || {};
    const rows = COLL_ROWS.filter(r => (ftd[r.key] || 0) > 0 || (mtd[r.key] || 0) > 0);
    const totalFtd = rows.reduce((s, r) => s + (Number(ftd[r.key]) || 0), 0);
    const totalMtd = rows.reduce((s, r) => s + (Number(mtd[r.key]) || 0), 0);

    const pieData = rows.filter(r => (ftd[r.key] || 0) > 0).map(r => ({ name: r.label, value: toLakhs(ftd[r.key]), color: r.color }));

    return (
        <div className="space-y-4">
            {pieData.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {rows.filter(r => (ftd[r.key] || 0) > 0).map(r => (
                        <div key={r.key} className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-2.5">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                            <div className="min-w-0">
                                <div className="text-[10px] text-slate-500 font-600 truncate">{r.label}</div>
                                <div className="text-[13px] font-800 text-slate-700 tabular-nums">{fmtL(ftd[r.key])}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b-2 border-slate-100">
                            <th className="pb-2 font-700">Mode</th>
                            <th className="pb-2 text-right font-700">FTD (₹)</th>
                            <th className="pb-2 text-right font-700">FTD (L)</th>
                            <th className="pb-2 text-right font-700">MTD (L)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, label, color }) => (
                            <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="py-2 font-500 text-slate-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                    {label}
                                </td>
                                <td className="py-2 text-right font-600 text-slate-700 tabular-nums">{fmtRupee(ftd[key])}</td>
                                <td className="py-2 text-right font-700 text-slate-700 tabular-nums">{fmtL(ftd[key])}</td>
                                <td className="py-2 text-right text-slate-500 font-600 tabular-nums">{fmtL(mtd[key])}</td>
                            </tr>
                        ))}
                        <tr className="font-700 bg-slate-50 border-t-2 border-slate-200 text-[13px]">
                            <td className="py-2.5 text-slate-800">Total Collection</td>
                            <td className="py-2.5 text-right text-blue-700 tabular-nums">{fmtRupee(totalFtd)}</td>
                            <td className="py-2.5 text-right text-blue-700 tabular-nums">{fmtL(totalFtd)}</td>
                            <td className="py-2.5 text-right text-slate-600 tabular-nums">{fmtL(totalMtd)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Volume Section ───────────────────────────────────────────────────────────
const VOL_ROWS = [
    { key: 'total_op',      label: 'OP Patients',     format: 'count' },
    { key: 'er_count',      label: 'ER Patients',     format: 'count' },
    { key: 'admission',     label: 'Admissions',      format: 'count' },
    { key: 'discharge',     label: 'Discharges',      format: 'count' },
    { key: 'occupancy',     label: 'Beds Occupied',   format: 'count' },
    { key: 'occupancy_pct', label: 'Occupancy %',     format: 'pct'   },
];

const VolumeSection = ({ volume, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={3} />;
    if (!volume) return <EmptyState title="No volume data" />;
    const ftd = volume.ftd || {};
    const mtd = volume.mtd || {};
    const rows = VOL_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b-2 border-slate-100">
                        <th className="pb-2 font-700">Metric</th>
                        <th className="pb-2 text-right font-700">FTD</th>
                        <th className="pb-2 text-right font-700">MTD</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, label, format }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 font-500 text-slate-700">{label}</td>
                            <td className="py-2.5 text-right font-700 text-blue-700 tabular-nums">
                                {format === 'pct' ? fmtPct(ftd[key]) : (Number(ftd[key]) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right text-slate-500 font-600 tabular-nums">
                                {format === 'pct' ? fmtPct(mtd[key]) : (Number(mtd[key]) || 0).toLocaleString('en-IN')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Trend Chart ──────────────────────────────────────────────────────────────
const TrendSection = ({ data, isLoading, month }) => {
    if (isLoading) return <ChartSkeleton height={220} />;
    if (!data?.length) return <EmptyState title="No trend data for this period" />;

    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        Revenue: toLakhs(d.total_revenue ?? d.revenue ?? d.total),
        Collection: toLakhs(d.total_collection ?? d.collection),
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradColl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
                <Tooltip formatter={(v, n) => [`₹${v}L`, n]} labelFormatter={l => `Date: ${l}`}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Revenue" stroke="#1d4ed8" strokeWidth={2} fill="url(#gradRev)" dot={false} />
                <Area type="monotone" dataKey="Collection" stroke="#059669" strokeWidth={2} fill="url(#gradColl)" dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Discount / Refund / MRI mini cards ───────────────────────────────────────
const SummaryMiniCards = ({ discount, refund, mri, isLoading }) => {
    if (isLoading) return <div className="grid grid-cols-3 gap-3"><div className="h-16 bg-slate-100 rounded-xl animate-pulse" /><div className="h-16 bg-slate-100 rounded-xl animate-pulse" /><div className="h-16 bg-slate-100 rounded-xl animate-pulse" /></div>;
    const cards = [
        { label: 'Discount (FTD)', value: discount?.ftd?.total,  color: 'text-red-600',   bg: 'bg-red-50 border-red-100' },
        { label: 'Refund (FTD)',   value: refund?.ftd?.total,    color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
        { label: 'MRI / Scan',     value: mri?.ftd?.total,       color: 'text-violet-700',bg: 'bg-violet-50 border-violet-100' },
    ];
    return (
        <div className="grid grid-cols-3 gap-3">
            {cards.map(({ label, value, color, bg }) => (
                <div key={label} className={`border rounded-xl p-3 ${bg}`}>
                    <div className="text-[9px] font-700 uppercase tracking-wider text-slate-400 mb-1">{label}</div>
                    <div className={`text-[16px] font-800 tabular-nums ${color}`}>{fmtL(value)}</div>
                    <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">MTD {fmtL(value === discount?.ftd?.total ? discount?.mtd?.total : value === refund?.ftd?.total ? refund?.mtd?.total : mri?.mtd?.total)}</div>
                </div>
            ))}
        </div>
    );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children, action }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <div className="flex-1 min-w-0">
                <span className="text-[12px] font-700 uppercase tracking-wider text-slate-600">{title}</span>
                {subtitle && <span className="text-[11px] text-slate-400 ml-2">{subtitle}</span>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ─── Export Panel ─────────────────────────────────────────────────────────────
const ExportPanel = ({ branch, date, enabled, mis }) => {
    const [exporting, setExporting] = useState(null);
    const [emailOpen, setEmailOpen] = useState(false);
    const [emailTo, setEmailTo]     = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const branchShort = branch?.slice(0, 3).toUpperCase() || 'RPT';
    const dateLabel   = date?.replace(/-/g, '') || '';
    const fname       = (ext) => `MIS-${branchShort}-${dateLabel}.${ext}`;

    const handleExport = (type, fn, ext) => {
        setExporting(type);
        triggerDownload(fn, fname(ext), null, () => setExporting(null));
    };

    const handleEmail = async () => {
        if (!emailTo) return;
        setExporting('email');
        try {
            await misApi.emailReport(branch, date, emailTo);
            setEmailSent(true);
            setTimeout(() => { setEmailOpen(false); setEmailSent(false); setEmailTo(''); }, 2000);
        } catch {
            alert('Email failed — check SMTP settings.');
        } finally {
            setExporting(null);
        }
    };

    const btns = [
        { id: 'excel', icon: FileSpreadsheet, label: 'Export Excel',     sub: '.xlsx',     color: 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300', fn: () => misApi.exportExcel(branch, date), ext: 'xlsx' },
        { id: 'pdf',   icon: FileText,        label: 'Export PDF',       sub: 'A4 landscape', color: 'text-red-600 hover:bg-red-50 hover:border-red-300',           fn: () => misApi.exportPdf(branch, date),   ext: 'pdf'  },
        { id: 'csv',   icon: Table2,          label: 'Export CSV',       sub: 'Flat rows', color: 'text-amber-600 hover:bg-amber-50 hover:border-amber-300',        fn: () => misApi.exportCsv(branch, date),   ext: 'csv'  },
        { id: 'print', icon: Printer,         label: 'Print Preview',    sub: 'New tab',   color: 'text-violet-600 hover:bg-violet-50 hover:border-violet-300', fn: null, ext: null },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-[12px] font-700 uppercase tracking-wider text-slate-600">Export & Actions</span>
            </div>
            <div className="p-3 space-y-2">
                {!enabled && (
                    <div className="text-[11px] text-slate-400 text-center py-4">Generate a report first to enable exports.</div>
                )}
                {enabled && btns.map(({ id, icon: Icon, label, sub, color, fn, ext }) => (
                    <button
                        key={id}
                        disabled={!!exporting}
                        onClick={() => {
                            if (id === 'print') { window.open(misApi.printPreview(branch, date), '_blank'); return; }
                            handleExport(id, fn, ext);
                        }}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 text-left transition-all cursor-pointer bg-white disabled:opacity-50',
                            color,
                        )}
                    >
                        {exporting === id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <Icon className="w-4 h-4" />
                        }
                        <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-600 text-slate-700">{exporting === id ? 'Downloading…' : label}</div>
                            <div className="text-[10px] text-slate-400">{sub}</div>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    </button>
                ))}

                {/* Email */}
                {enabled && (
                    <div className="border-t border-slate-100 pt-2">
                        {!emailOpen ? (
                            <button
                                onClick={() => setEmailOpen(true)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 text-left hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer bg-white"
                            >
                                <Mail className="w-4 h-4 text-blue-600" />
                                <div className="flex-1">
                                    <div className="text-[12px] font-600 text-slate-700">Email Report</div>
                                    <div className="text-[10px] text-slate-400">Send PDF via email</div>
                                </div>
                                <Send className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            </button>
                        ) : (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                                {emailSent ? (
                                    <div className="flex items-center gap-2 text-[12px] text-green-700 font-600">
                                        <CheckCircle2 className="w-4 h-4" /> Email queued successfully!
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-700 text-blue-700">Send to</span>
                                            <button onClick={() => setEmailOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <input
                                            type="email"
                                            value={emailTo}
                                            onChange={e => setEmailTo(e.target.value)}
                                            placeholder="recipient@hospital.com"
                                            className="w-full px-2.5 py-1.5 text-[12px] border border-blue-200 rounded-md bg-white focus:outline-none focus:border-blue-400"
                                        />
                                        <button
                                            onClick={handleEmail}
                                            disabled={!emailTo || !!exporting}
                                            className="w-full py-1.5 bg-blue-600 text-white text-[12px] font-700 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                                        >
                                            {exporting === 'email' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                            {exporting === 'email' ? 'Sending…' : 'Send Report'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Quick Summary Sidebar Card ────────────────────────────────────────────────
const QuickSummary = ({ mis }) => {
    if (!mis) return null;
    const ftdRev  = mis.sales?.ftd    || {};
    const ftdColl = mis.collection?.ftd || {};
    const totalRev  = Object.values(ftdRev).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalColl = Object.values(ftdColl).reduce((s, v) => s + (Number(v) || 0), 0);
    const diff      = totalRev - totalColl;
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-[12px] font-700 uppercase tracking-wider text-slate-600">Day Summary</span>
            </div>
            <div className="p-4 space-y-2">
                {[
                    { label: 'Total Revenue', value: fmtL(totalRev),  color: 'text-blue-700 font-800' },
                    { label: 'Total Collection', value: fmtL(totalColl), color: 'text-green-700 font-800' },
                    { label: 'Discount', value: fmtL(mis.discount?.ftd?.total), color: 'text-red-600 font-700' },
                    { label: 'Refund',   value: fmtL(mis.refund?.ftd?.total),   color: 'text-amber-600 font-700' },
                    { label: 'Outstanding', value: fmtL(Math.max(0, diff)), color: diff > 0 ? 'text-red-600 font-700' : 'text-slate-500' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-[11px] text-slate-500 font-500">{label}</span>
                        <span className={`text-[13px] tabular-nums ${color}`}>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = ({ branch, date, onBranch, onDate, onGenerate, isLoading }) => {
    const PRESETS = [
        { label: 'Today',     value: today() },
        { label: 'Yesterday', value: shiftDate(today(), -1) },
        { label: 'MTD',       value: today() },
    ];
    return (
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-3">
            {/* Branch */}
            <div className="flex gap-1.5">
                {Object.entries(BRANCHES).map(([key, { label }]) => (
                    <button key={key} onClick={() => onBranch(key)}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-[12px] font-600 border-[1.5px] transition-all cursor-pointer',
                            branch === key
                                ? 'bg-blue-700 border-blue-700 text-white shadow-sm shadow-blue-200'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="w-px h-5 bg-slate-200" />

            {/* Date navigation */}
            <div className="flex items-center gap-1">
                <button onClick={() => onDate(shiftDate(date, -1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer bg-white">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <input type="date" value={date} max={todayStr}
                    onChange={e => onDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[12px] font-600 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white" />
                <button onClick={() => { if (date < todayStr) onDate(shiftDate(date, 1)); }}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer bg-white disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Presets */}
            <div className="hidden sm:flex gap-1">
                {PRESETS.map(({ label, value }) => (
                    <button key={label} onClick={() => onDate(value)}
                        className={cn(
                            'px-2.5 py-1 rounded-md border text-[11px] font-600 transition-all cursor-pointer',
                            date === value
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 bg-white',
                        )}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Generate */}
            <button onClick={onGenerate} disabled={isLoading}
                className="ml-auto inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-700 rounded-lg shadow-md shadow-blue-200 hover:opacity-90 transition-all cursor-pointer disabled:opacity-60">
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                {isLoading ? 'Loading…' : 'Generate Report'}
            </button>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MISReport() {
    const token    = useSelector(selectToken);
    const branch   = useSelector(selBranch);
    const date     = useSelector(selDate);
    const dispatch = useDispatch();

    const [enabled, setEnabled] = useState(false);

    if (!token) return <Navigate to="/login" replace />;

    const from = monthStart(date);

    // MIS data
    const misQ = useQuery({
        queryKey: ['mis-page', branch, date],
        queryFn:  () => misApi.show(branch, date).then(r => r.data),
        enabled,
        retry: 1,
        staleTime: 1000 * 60 * 10,
    });

    // MTD trend
    const trendQ = useQuery({
        queryKey: ['mis-trend', branch, from, date],
        queryFn:  () => analyticsApi.dailyTrend({ branch, from, to: date }).then(r => r.data),
        enabled: enabled && misQ.isSuccess,
        staleTime: 1000 * 60 * 10,
    });

    const handleGenerate = useCallback(() => {
        setEnabled(true);
        misQ.refetch();
    }, [misQ]);

    const mis       = misQ.data?.success ? misQ.data.data : null;
    const isLoading = misQ.isLoading || misQ.isFetching;
    const isError   = misQ.isError;
    const trend     = trendQ.data?.success ? trendQ.data.data : [];

    const ftdRev = mis?.sales?.ftd || {};
    const mtdRev = mis?.sales?.mtd || {};
    const ftdVol = mis?.volume?.ftd || {};
    const mtdVol = mis?.volume?.mtd || {};
    const ftdColl = mis?.collection?.ftd || {};
    const mtdColl = mis?.collection?.mtd || {};
    const totalFtdRev  = Object.values(ftdRev).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalMtdRev  = Object.values(mtdRev).reduce((s, v) => s + (Number(v) || 0), 0);

    return (
        <AppLayout topbar={
            <FilterBar
                branch={branch}
                date={date}
                onBranch={b => { dispatch(setBranch(b)); if (enabled) misQ.refetch(); }}
                onDate={d => { dispatch(setDate(d)); if (enabled) setEnabled(false); }}
                onGenerate={handleGenerate}
                isLoading={isLoading}
            />
        }>
            <main className="flex-1 p-5 space-y-4 min-w-0">

                {/* Empty state */}
                {!enabled && (
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="text-center max-w-xs">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <BarChart3 className="w-7 h-7 text-blue-600" />
                            </div>
                            <h2 className="text-[16px] font-700 text-slate-700 mb-2">MIS Report</h2>
                            <p className="text-[13px] text-slate-400 mb-5 leading-relaxed">
                                Select a branch and date, then click Generate Report to view the daily management information report.
                            </p>
                            <button onClick={handleGenerate}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-700 rounded-lg shadow-md hover:opacity-90 transition-all cursor-pointer border-0">
                                <RefreshCw className="w-4 h-4" />
                                Generate Report
                            </button>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {enabled && isError && (
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="text-center max-w-sm">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                            <h2 className="text-[15px] font-700 text-slate-700 mb-1">No data found</h2>
                            <p className="text-[12px] text-slate-400 mb-4">No MIS data for <strong>{BRANCHES[branch]?.label}</strong> on <strong>{fmtDateShort(date)}</strong>. Import the CSV files first.</p>
                            <button onClick={handleGenerate}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-[12px] font-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer border-0">
                                <RefreshCw className="w-3.5 h-3.5" /> Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Report content */}
                {enabled && !isError && (
                    <>
                        {/* Report header */}
                        {!isLoading && mis && (
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <h2 className="text-[16px] font-700 text-slate-800">
                                        Daily MIS — {BRANCHES[branch]?.label}
                                    </h2>
                                    <p className="text-[12px] text-slate-400 mt-0.5">
                                        {fmtDateShort(date)} &nbsp;·&nbsp; Month: {monthLabel(date)} &nbsp;·&nbsp; Generated {mis.generated_at?.slice(11, 16)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-600 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Data loaded
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* KPI Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                            {isLoading ? Array(6).fill(0).map((_, i) => <KPICard key={i} skeleton />) : [
                                { label: 'Total Revenue',   ftd: totalFtdRev,        mtd: totalMtdRev,         Icon: DollarSign,  color: 'blue'   },
                                { label: 'OP Revenue',      ftd: ftdRev.op,          mtd: mtdRev.op,           Icon: CreditCard,  color: 'green'  },
                                { label: 'IP Revenue',      ftd: ftdRev.ip,          mtd: mtdRev.ip,           Icon: BedDouble,   color: 'violet' },
                                { label: 'Pharmacy',        ftd: ftdRev.ph,          mtd: mtdRev.ph,           Icon: Activity,    color: 'amber'  },
                                { label: 'Collection',      ftd: Object.values(ftdColl).reduce((s,v)=>s+(Number(v)||0),0), mtd: Object.values(mtdColl).reduce((s,v)=>s+(Number(v)||0),0), Icon: CreditCard, color: 'cyan' },
                                { label: 'OP Patients',     ftd: ftdVol.total_op,    mtd: mtdVol.total_op,     Icon: Users,       color: 'green', format: 'count' },
                            ].map(k => <KPICard key={k.label} {...k} />)}
                        </div>

                        {/* Main grid: content + sidebar */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                            {/* Left — main content */}
                            <div className="xl:col-span-2 space-y-4">

                                <Section title="Revenue Breakdown" subtitle={`FTD: ${fmtL(totalFtdRev)} · MTD: ${fmtL(totalMtdRev)}`}>
                                    <RevenueSection sales={mis?.sales} isLoading={isLoading} />
                                </Section>

                                <Section title="Collection Breakdown" subtitle={`FTD: ${fmtL(ftdColl.total)} · MTD: ${fmtL(mtdColl.total)}`}>
                                    <CollectionSection collection={mis?.collection} isLoading={isLoading} />
                                </Section>

                                <SummaryMiniCards discount={mis?.discount} refund={mis?.refund} mri={mis?.mri} isLoading={isLoading} />

                                <Section title="Volume & Occupancy" subtitle="For selected date (FTD) and month-to-date (MTD)">
                                    <VolumeSection volume={mis?.volume} isLoading={isLoading} />
                                </Section>

                                <Section title="MTD Revenue & Collection Trend" subtitle={monthLabel(date)}>
                                    <TrendSection data={trend} isLoading={trendQ.isLoading} />
                                </Section>
                            </div>

                            {/* Right — sidebar */}
                            <div className="space-y-4">
                                <ExportPanel branch={branch} date={date} enabled={!isLoading && !!mis} mis={mis} />
                                <QuickSummary mis={mis} />

                                {/* Package adjustment card */}
                                {!isLoading && mis?.pkg_adjustment && (
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <span className="text-[12px] font-700 uppercase tracking-wider text-slate-600">Package Adjustment</span>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            {[
                                                { label: 'FTD Adjustment', value: mis.pkg_adjustment.ftd },
                                                { label: 'MTD Adjustment', value: mis.pkg_adjustment.mtd },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="flex items-center justify-between">
                                                    <span className="text-[11px] text-slate-500">{label}</span>
                                                    <span className="text-[12px] font-700 text-violet-700 tabular-nums">{fmtL(value)}</span>
                                                </div>
                                            ))}
                                            <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                                                Chromepet only: Package revenue moved from IP to Pharmacy to avoid double-counting.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Branch info */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <div className="text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-3">Branch Info</div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Branch', value: BRANCHES[branch]?.label },
                                            { label: 'Bed Capacity', value: `${BRANCHES[branch]?.beds} beds` },
                                            { label: 'Report Date', value: formatDisplayDate(date) },
                                            { label: 'MTD Period', value: `${formatDisplayDate(from)} – ${formatDisplayDate(date)}` },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">{label}</span>
                                                <span className="text-slate-700 font-600">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </AppLayout>
    );
}
