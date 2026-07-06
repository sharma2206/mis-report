import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, BarChart3, PieChart as PieIcon,
    BedDouble, Scissors, Users, Wallet, Package, Stethoscope,
    CreditCard, HeartPulse, ShoppingBag, Activity, Star,
    RefreshCw, ChevronRight,
} from 'lucide-react';
import { selectToken } from '../store/authSlice';
import {
    selectBranch as selBranch, selectDate as selDate, selectActiveTab,
    selectPeriodMode, selectPeriodFrom, selectPeriodTo, setActiveTab,
} from '../store/reportSlice';
import { useDashboard } from '../hooks/useDashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { Topbar } from '../components/layout/Topbar';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { RankedList, PayerChips } from '../components/ui/RankedList';
import { KPIStrip } from '../components/ui/KPIStrip';
import { QuickActions } from '../components/ui/QuickActions';
import { SmartAlerts } from '../components/ui/SmartAlerts';
import {
    AdmissionsChart, DeptRevenueChart, PharmacyTrendChart,
    BedOccupancyChart, RevenueTrendChart,
} from '../components/ui/DashboardCharts';
import { fmtL, fmtRupee, fmtPct, toLakhs, cfClass } from '../utils/formatters';
import { CHART_PALETTE } from '../constants';
import { misApi } from '../services/api';
import { cn } from '../utils/cn';

// ── Dashboard tab definitions ────────────────────────────────────────────────
const TABS = [
    { key: 'overview',   label: 'Overview',     icon: LayoutDashboard },
    { key: 'revenue',    label: 'Revenue',      icon: TrendingUp      },
    { key: 'volume',     label: 'Volume',       icon: BarChart3       },
    { key: 'analytics',  label: 'Analytics',    icon: PieIcon         },
    { key: 'ip',         label: 'IP',           icon: BedDouble       },
    { key: 'surgery',    label: 'Surgery',      icon: Scissors        },
    { key: 'op',         label: 'OP',           icon: Users           },
    { key: 'collection', label: 'Collection',   icon: Wallet          },
    { key: 'service',    label: 'Service Mix',  icon: Package         },
    { key: 'doctors',    label: 'Doctors',      icon: Stethoscope     },
];

// ── Shared chart tooltip style ────────────────────────────────────────────────
const TOOLTIP = {
    borderRadius: 10, border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px',
};
const AXIS_TICK = { fontSize: 10, fill: '#94a3b8' };

// ── Section card wrapper ──────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, action, compact }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
            {Icon && (
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
            )}
            <span className="text-[12px] font-700 text-slate-700 flex-1">{title}</span>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className={compact ? 'p-3' : 'p-4'}>{children}</div>
    </div>
);

// ── Revenue table ─────────────────────────────────────────────────────────────
const REV_ROWS = [
    { key: 'op',       label: 'OP Revenue'   },
    { key: 'ip',       label: 'IP Revenue'   },
    { key: 'er',       label: 'ER Revenue'   },
    { key: 'pharmacy', label: 'Pharmacy'     },
    { key: 'packages', label: 'Packages'     },
    { key: 'mri',      label: 'MRI / Scan'   },
];

const RevenueTable = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={7} cols={4} />;
    if (!mis) return <EmptyState title="No revenue data" description="Load a report to see revenue breakdown." />;
    const ftd = mis.revenue?.ftd || {};
    const mtd = mis.revenue?.mtd || {};
    const rows = REV_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined);
    const totalFtd = rows.reduce((a, r) => a + (Number(ftd[r.key]) || 0), 0);
    const totalMtd = rows.reduce((a, r) => a + (Number(mtd[r.key]) || 0), 0);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 pr-4 font-700">Category</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD (₹)</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD (L)</th>
                        <th className="pb-2 text-right font-700">MTD (L)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, label }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2 pr-4 font-500 text-slate-700">{label}</td>
                            <td className={`py-2 pr-4 text-right font-600 ${cfClass(toLakhs(ftd[key]))}`}>{fmtRupee(ftd[key])}</td>
                            <td className={`py-2 pr-4 text-right font-700 ${cfClass(toLakhs(ftd[key]))}`}>{fmtL(ftd[key])}</td>
                            <td className="py-2 text-right font-600 text-slate-500">{fmtL(mtd[key])}</td>
                        </tr>
                    ))}
                    <tr className="font-700 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200">
                        <td className="py-2.5 pr-4 text-slate-800">Total</td>
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totalFtd))}`}>{fmtRupee(totalFtd)}</td>
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totalFtd))}`}>{fmtL(totalFtd)}</td>
                        <td className="py-2.5 text-right text-slate-600">{fmtL(totalMtd)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// ── Volume grid ───────────────────────────────────────────────────────────────
const VOLUME_ROWS = [
    { key: 'op_count',       label: 'OP Patients'   },
    { key: 'ip_count',       label: 'IP Patients'   },
    { key: 'er_count',       label: 'ER Patients'   },
    { key: 'admission',      label: 'Admissions'    },
    { key: 'discharge',      label: 'Discharges'    },
    { key: 'pharmacy_bills', label: 'Pharmacy Bills'},
    { key: 'package_count',  label: 'Packages'      },
    { key: 'mri_count',      label: 'MRI / Scans'   },
    { key: 'surgery_count',  label: 'Surgeries'     },
    { key: 'occupancy',      label: 'Beds Occupied' },
    { key: 'occupancy_pct',  label: 'Occupancy %'   },
];

const VolumeGrid = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={3} />;
    if (!mis) return <EmptyState title="No volume data" />;
    const ftd = mis.volume?.ftd || {};
    const mtd = mis.volume?.mtd || {};
    const fmt = (key, v) => {
        if (v === null) return <span className="text-slate-400 italic text-[11px]">N/A</span>;
        if (key === 'occupancy_pct') return <span>{fmtPct(v)}</span>;
        return <span>{(v ?? 0).toLocaleString()}</span>;
    };
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 pr-4 font-700">Metric</th>
                        <th className="pb-2 pr-4 text-right font-700">FTD</th>
                        <th className="pb-2 text-right font-700">MTD</th>
                    </tr>
                </thead>
                <tbody>
                    {VOLUME_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined).map(({ key, label }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2 pr-4 font-500 text-slate-700">{label}</td>
                            <td className="py-2 pr-4 text-right font-700 text-blue-700">{fmt(key, ftd[key])}</td>
                            <td className="py-2 text-right font-600 text-slate-500">{fmt(key, mtd[key])}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Payer Mix Chart ───────────────────────────────────────────────────────────
const PAYMENT_COLORS = ['#1d4ed8','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];

const PayerChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No payer data" />;
    const chartData = data.slice(0, 8).map(d => ({
        name:  d.payer_type || d.payer_name || d.payer || 'Unknown',
        value: toLakhs(d.amount || d.total_amount),
    }));
    return (
        <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={180}>
                <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                        dataKey="value" strokeWidth={2} stroke="#fff">
                        {chartData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`₹${v}L`]} contentStyle={{ ...TOOLTIP, fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 min-w-0">
                {chartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[11px]">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                        <span className="font-700 text-slate-800">₹{d.value}L</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Patient Mix Chart ─────────────────────────────────────────────────────────
const PatientMixChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No patient mix data" />;
    const chartData = data.map(d => ({
        date: (d.day || d.date)?.slice(5) || d.day || d.date,
        OP:   d.op ?? d.op_count ?? 0,
        IP:   d.ip ?? d.ip_count ?? 0,
        ER:   d.er ?? d.er_count ?? 0,
    }));
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <defs>
                    <linearGradient id="opG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d4ed8"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient>
                    <linearGradient id="ipG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient>
                    <linearGradient id="erG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
                </defs>
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.07)' }} />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="OP" fill="url(#opG)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="IP" fill="url(#ipG)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ER" fill="url(#erG)" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ── IP Demographics ───────────────────────────────────────────────────────────
const StatBox = ({ label, value, color = 'blue' }) => (
    <div className={`bg-${color}-50 border border-${color}-100 rounded-xl p-2.5 text-center`}>
        <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
        <div className={`text-[18px] font-800 text-${color}-700 tabular-nums`}>{value ?? 0}</div>
    </div>
);

const IPDemographics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={4} />;
    if (!data) return <EmptyState title="No IP demographics data" />;
    const { by_gender = [], by_payer_type = [], by_ward = [], top_doctors = [] } = data;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <StatBox label="Total IP"   value={data.total}          color="blue"   />
                <StatBox label="Below 18"   value={data.age_below_18}   color="violet" />
                <StatBox label="18+ Years"  value={data.age_18_plus}    color="slate"  />
                <StatBox label="Avg LOS"    value={data.avg_los_days ? `${data.avg_los_days}d` : 0} color="cyan" />
                <StatBox label="MLC"        value={data.mlc_count}      color="amber"  />
                <StatBox label="Deaths"     value={data.death_count}    color="red"    />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {by_gender.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Gender</p><RankedList items={by_gender} nameKey="gender" valueKey="count" barColor="#1d4ed8" /></div>}
                {by_payer_type.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Payer</p><RankedList items={by_payer_type} nameKey="payer_type" valueKey="count" barColor="#7c3aed" /></div>}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {by_ward.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Ward</p><RankedList items={by_ward.slice(0, 8)} nameKey="ward" valueKey="count" barColor="#059669" /></div>}
                {top_doctors.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors</p><RankedList items={top_doctors.slice(0, 8)} nameKey="doctor" valueKey="count" barColor="#d97706" /></div>}
            </div>
        </div>
    );
};

// ── Surgery Detail ────────────────────────────────────────────────────────────
const SurgeryDetail = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={4} />;
    if (!data) return <EmptyState title="No surgery data" description="Upload a surgery file to see details." />;
    const { by_surgeon = [], by_dept = [], by_ot_room = [] } = data;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[['Total', data.total], ['Major', data.major], ['Minor', data.minor],
                  ['Day Surgery', data.day_surgery], ['Emergency', data.emergency], ['Implants', data.implant]
                ].map(([label, val]) => (
                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                        <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                        <div className="text-[18px] font-800 text-blue-700">{val ?? 0}</div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {by_surgeon.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Surgeon</p><RankedList items={by_surgeon.slice(0, 10)} nameKey="surgeon" valueKey="count" barColor="#1d4ed8" /></div>}
                {by_dept.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p><RankedList items={by_dept.slice(0, 10)} nameKey="dept" valueKey="count" barColor="#7c3aed" /></div>}
            </div>
            {by_ot_room.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By OT Room</p><RankedList items={by_ot_room} nameKey="ot_name" valueKey="count" barColor="#059669" /></div>}
        </div>
    );
};

// ── OP Metrics ────────────────────────────────────────────────────────────────
const OPMetrics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={3} />;
    if (!data) return <EmptyState title="No OP metrics" />;
    const topDoctors = data.top_doctors || data.by_doctor || [];
    const byDept     = data.by_dept     || [];
    const byGender   = data.by_gender   || [];
    const byPayer    = data.by_payer_type || [];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                    ['Total Visits',    data.total_visits    ?? 0, 'blue'],
                    ['Unique Patients', data.unique_patients ?? 0, 'violet'],
                    ['Total Revenue',   fmt(data.total_revenue),   'green'],
                    ['Discount',        fmt(data.total_discount),  'amber'],
                ].map(([label, val, color]) => (
                    <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-2.5 text-center`}>
                        <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                        <div className={`text-[16px] font-800 text-${color}-700`}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {topDoctors.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors</p><RankedList items={topDoctors} nameKey="doctor" valueKey="visits" barColor="#059669" /></div>}
                {byDept.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p><RankedList items={byDept} nameKey="dept" valueKey="visits" barColor="#7c3aed" /></div>}
            </div>
            {(byGender.length > 0 || byPayer.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {byGender.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Gender</p><RankedList items={byGender} nameKey="gender" valueKey="visits" barColor="#0891b2" /></div>}
                    {byPayer.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Payer Type</p><RankedList items={byPayer} nameKey="payer_type" valueKey="visits" barColor="#d97706" /></div>}
                </div>
            )}
        </div>
    );
};

// ── Collection Tab ────────────────────────────────────────────────────────────
const CollectionTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No collection data" description="Upload a cashier collection file to see payment analytics." />;
    const byMode  = data.payment_modes  || data.by_payment_mode || [];
    const byType  = data.by_patient_type || [];
    const byTxn   = data.by_category    || data.by_transaction_category || [];
    const daily   = data.daily_trend    || [];
    const total   = data.total_collection || 0;
    const fmt     = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    ['Total Collection', fmt(total),                                                                    'blue'],
                    ['Cash',            fmt(byMode.find(m => m.mode === 'Cash')?.amount),                               'green'],
                    ['Digital',         fmt(byMode.find(m => /UPI|Digital/i.test(m.mode))?.amount),                    'violet'],
                    ['TPA',             fmt(byMode.find(m => /TPA/i.test(m.mode))?.amount),                            'amber'],
                ].map(([label, val, color]) => (
                    <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
                        <div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">{label}</div>
                        <div className={`text-[1.05rem] font-800 text-${color}-700`}>{val || '₹0'}</div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Payment Mode Breakdown" icon={Wallet}>
                    {byMode.length ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={byMode} dataKey="amount" nameKey="mode" cx="50%" cy="50%" outerRadius={72} label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                        {byMode.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={v => fmt(v)} contentStyle={{ ...TOOLTIP, fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {byMode.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between text-[12px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                                            <span className="text-slate-600 font-500">{m.mode}</span>
                                        </div>
                                        <span className="font-700 text-slate-700">{fmt(m.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : <EmptyState title="No payment mode data" />}
                </Section>
                <Section title="By Patient Type" icon={Users}>
                    {byType.length ? (
                        <RankedList items={byType} nameKey="patient_type" valueKey="amount" barColor="#1d4ed8" valueFormat={fmt} />
                    ) : <EmptyState title="No patient type data" />}
                    {byTxn.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Transaction Type</p>
                            <RankedList items={byTxn} nameKey="category" valueKey="amount" barColor="#7c3aed" valueFormat={fmt} />
                        </div>
                    )}
                </Section>
            </div>
            {daily.length > 0 && (
                <Section title="Daily Collection Trend" icon={TrendingUp}>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => v?.slice(5)} />
                            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => [fmt(v), 'Collection']} labelFormatter={l => `Date: ${l}`} contentStyle={TOOLTIP} />
                            <Area type="monotone" dataKey="amount" stroke="#1d4ed8" strokeWidth={2} fill="url(#collGrad)" dot={false} activeDot={{ r: 4, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Section>
            )}
        </div>
    );
};

// ── Service Mix Tab ───────────────────────────────────────────────────────────
const ServiceMixTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No service data" description="Upload bill items file to see service mix analytics." />;
    const byType  = data.by_service_type || [];
    const byPtype = data.by_patient_type || [];
    const topItems = data.top_items      || [];
    const byDept   = data.by_department  || [];
    const SERVICE_COLORS = ['#1d4ed8','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e'];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3"><div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Revenue</div><div className="text-[1.05rem] font-800 text-blue-700">{fmt(data.total_revenue)}</div></div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3"><div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Discount</div><div className="text-[1.05rem] font-800 text-red-600">{fmt(data.total_discount)}</div></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Revenue by Service Type" icon={BarChart3}>
                    {byType.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byType} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <YAxis type="category" dataKey="service_type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                                <Tooltip formatter={v => [fmt(v), 'Revenue']} contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.07)' }} />
                                <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>{byType.map((_, i) => <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />)}</Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState title="No service type data" />}
                </Section>
                <Section title="Revenue by Patient Type" icon={Users}>
                    {byPtype.length ? <RankedList items={byPtype} nameKey="patient_type" valueKey="total_revenue" barColor="#7c3aed" valueFormat={fmt} /> : <EmptyState title="No patient type data" />}
                    {byDept.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Departments</p>
                            <RankedList items={byDept.slice(0, 6)} nameKey="department" valueKey="total_revenue" barColor="#059669" valueFormat={fmt} />
                        </div>
                    )}
                </Section>
            </div>
            {topItems.length > 0 && (
                <Section title="Top Revenue Items" icon={Star}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead><tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100"><th className="pb-1.5 pr-3">#</th><th className="pb-1.5 pr-3">Item</th><th className="pb-1.5 pr-3">Type</th><th className="pb-1.5 pr-3 text-right">Revenue</th><th className="pb-1.5 text-right">Count</th></tr></thead>
                            <tbody>
                                {topItems.slice(0, 12).map((item, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-1.5 pr-3 text-slate-400 font-600">{i + 1}</td>
                                        <td className="py-1.5 pr-3 font-600 text-slate-700 max-w-[200px] truncate">{item.service_item_name || item.item_name}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{item.service_type}</td>
                                        <td className="py-1.5 pr-3 text-right font-700 text-blue-700">{fmt(item.revenue || item.total_revenue)}</td>
                                        <td className="py-1.5 text-right text-slate-500">{item.qty ?? item.count ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}
        </div>
    );
};

// ── Doctor Performance Tab ────────────────────────────────────────────────────
const DoctorPerfTab = ({ data, isLoading }) => {
    const [sortKey, setSortKey] = useState('total_revenue');
    if (isLoading) return <TableSkeleton rows={10} cols={6} />;
    if (!data) return <EmptyState title="No doctor performance data" description="Upload bill items with doctor data." />;
    const doctors      = [...(data.doctors || [])].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    const bySpeciality = data.by_speciality || [];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const cols = [
        { key: 'total_revenue',   label: 'Revenue'  },
        { key: 'unique_patients', label: 'Patients' },
        { key: 'visit_count',     label: 'Visits'   },
        { key: 'ip_admissions',   label: 'IP Adm.'  },
        { key: 'surgeries',       label: 'Surgeries'},
    ];
    return (
        <div className="space-y-4">
            {bySpeciality.length > 0 && (
                <Section title="Revenue by Speciality" icon={Stethoscope}>
                    <RankedList items={bySpeciality.slice(0, 8)} nameKey="speciality" valueKey="total_revenue" barColor="#1d4ed8" valueFormat={fmt} />
                </Section>
            )}
            <Section title="Doctor Performance" icon={Users} action={
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Sort:</span>
                    <select value={sortKey} onChange={e => setSortKey(e.target.value)}
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 bg-white cursor-pointer outline-none focus:border-blue-400">
                        {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
            }>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                <th className="pb-1.5 pr-3">#</th>
                                <th className="pb-1.5 pr-3">Doctor</th>
                                <th className="pb-1.5 pr-3">Speciality</th>
                                {cols.map(c => (
                                    <th key={c.key} onClick={() => setSortKey(c.key)}
                                        className={`pb-1.5 pr-3 text-right cursor-pointer hover:text-slate-600 transition-colors ${sortKey === c.key ? 'text-blue-600' : ''}`}>
                                        {c.label}
                                    </th>
                                ))}
                                <th className="pb-1.5 text-right">Avg LOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctors.slice(0, 20).map((d, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="py-1.5 pr-3 text-slate-400 font-600">{i + 1}</td>
                                    <td className="py-1.5 pr-3 font-600 text-slate-700 max-w-[160px] truncate">{d.doctor || d.doctor_name}</td>
                                    <td className="py-1.5 pr-3 text-slate-500 max-w-[120px] truncate">{d.speciality || '—'}</td>
                                    <td className="py-1.5 pr-3 text-right font-700 text-blue-700">{fmt(d.total_revenue)}</td>
                                    <td className="py-1.5 pr-3 text-right text-slate-600">{d.unique_patients || 0}</td>
                                    <td className="py-1.5 pr-3 text-right text-slate-600">{d.visit_count || 0}</td>
                                    <td className="py-1.5 pr-3 text-right text-slate-600">{d.ip_admissions || 0}</td>
                                    <td className="py-1.5 pr-3 text-right text-slate-600">{d.surgeries || 0}</td>
                                    <td className="py-1.5 text-right text-slate-500">{d.avg_los ? `${Number(d.avg_los).toFixed(1)}d` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
};

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const AnalyticsTab = ({ payer, mix, isLoading }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="Payer Mix Breakdown" icon={PieIcon}>
                <PayerChart data={payer} isLoading={isLoading} />
                {!isLoading && payer?.length > 0 && (
                    <div className="mt-3"><PayerChips items={payer} nameKey="payer_name" countKey="patient_count" /></div>
                )}
            </Section>
            <Section title="Patient Mix Trend" icon={Users}>
                <PatientMixChart data={mix} isLoading={isLoading} />
            </Section>
        </div>
    </div>
);

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ mis, kpi, trend, payer, mix, collection, serviceRev, admissions, isLoading }) => {
    const ftdVol = mis?.volume?.ftd || {};
    return (
        <div className="space-y-4">
            <KPIStrip mis={mis} kpi={kpi} collection={collection} isLoading={isLoading} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Revenue Trend" icon={TrendingUp}>
                        <RevenueTrendChart data={trend} isLoading={isLoading} />
                    </Section>
                </div>
                <Section title="Payer Mix" icon={PieIcon}>
                    <PayerChart data={payer} isLoading={isLoading} />
                </Section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Patient Trend" icon={Users}>
                    <PatientMixChart data={mix} isLoading={isLoading} />
                </Section>
                <Section title="Admissions vs Discharges" icon={Activity}>
                    <AdmissionsChart data={
                        admissions
                            ? [{ date: 'IP', admissions: admissions.ip_total || 0, discharges: 0 },
                               { date: 'ER', admissions: admissions.er_total || 0, discharges: 0 }]
                            : []
                    } isLoading={isLoading} />
                </Section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Department Revenue" icon={BarChart3}>
                        <DeptRevenueChart data={serviceRev} isLoading={isLoading} />
                    </Section>
                </div>
                <div className="space-y-4">
                    <QuickActions />
                    <Section title="Bed Occupancy" icon={BedDouble}>
                        <BedOccupancyChart data={[]} occupancyPct={ftdVol.occupancy_pct} isLoading={isLoading} />
                    </Section>
                </div>
            </div>

            <Section title="Pharmacy Revenue Trend" icon={ShoppingBag}>
                <PharmacyTrendChart data={trend} isLoading={isLoading} />
            </Section>
        </div>
    );
};

// ── Horizontal Tab Strip ──────────────────────────────────────────────────────
const TabStrip = ({ tab, onChange }) => (
    <div className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-none flex-shrink-0">
        <div className="flex gap-0 min-w-max px-1">
            {TABS.map(({ key, label, icon: Icon }) => {
                const active = tab === key;
                return (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        className={cn(
                            'relative flex items-center gap-1.5 px-3.5 py-3 text-[12px] font-600 border-b-2 transition-all cursor-pointer whitespace-nowrap border-0 bg-transparent',
                            active
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                        )}
                    >
                        <Icon className={cn('w-3.5 h-3.5', active ? 'text-blue-600' : 'text-slate-400')} />
                        {label}
                    </button>
                );
            })}
        </div>
    </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
    const token      = useSelector(selectToken);
    const branch     = useSelector(selBranch);
    const date       = useSelector(selDate);
    const tab        = useSelector(selectActiveTab);
    const dispatch   = useDispatch();
    const periodMode = useSelector(selectPeriodMode);
    const periodFrom = useSelector(selectPeriodFrom);
    const periodTo   = useSelector(selectPeriodTo);

    const [rangeFrom, setRangeFrom] = useState(null);
    const effectiveFrom = periodMode === 'custom' ? periodFrom : rangeFrom;

    const { mis, kpi, trend, payer, mix, ipDemo, surgery, op, collection, serviceRev, doctorPerf, admissions, isLoading, isError, refetch } =
        useDashboard(branch, date, effectiveFrom);

    if (!token) return <Navigate to="/login" replace />;

    const handleLoad = useCallback((from, _to) => {
        if (from) setRangeFrom(from);
        else refetch();
    }, [refetch]);

    const handlePrint = () => window.open(misApi.printPreview(branch, date), '_blank');

    const tabContent = () => {
        switch (tab) {
            case 'overview':   return <OverviewTab mis={mis} kpi={kpi} trend={trend} payer={payer} mix={mix} collection={collection} serviceRev={serviceRev} admissions={admissions} isLoading={isLoading} />;
            case 'revenue':    return <div className="space-y-4"><Section title="Revenue Breakdown" icon={CreditCard}><RevenueTable mis={mis} isLoading={isLoading} /></Section><Section title="Daily Revenue Trend" icon={TrendingUp}><RevenueTrendChart data={trend} isLoading={isLoading} /></Section></div>;
            case 'volume':     return <div className="space-y-4"><Section title="Volume & MRI Metrics" icon={BarChart3}><VolumeGrid mis={mis} isLoading={isLoading} /></Section><Section title="Patient Volume Trend" icon={Users}><PatientMixChart data={mix} isLoading={isLoading} /></Section></div>;
            case 'analytics':  return <AnalyticsTab payer={payer} mix={mix} isLoading={isLoading} />;
            case 'ip':         return <Section title="IP Admissions & Demographics" icon={BedDouble}><IPDemographics data={ipDemo} isLoading={isLoading} /></Section>;
            case 'surgery':    return <Section title="Surgery Analytics" icon={Scissors}><SurgeryDetail data={surgery} isLoading={isLoading} /></Section>;
            case 'op':         return <Section title="OP Metrics" icon={Users}><OPMetrics data={op} isLoading={isLoading} /></Section>;
            case 'collection': return <CollectionTab data={collection} isLoading={isLoading} />;
            case 'service':    return <ServiceMixTab data={serviceRev} isLoading={isLoading} />;
            case 'doctors':    return <DoctorPerfTab data={doctorPerf} isLoading={isLoading} />;
            default:           return null;
        }
    };

    return (
        <AppLayout onPrint={handlePrint} topbar={
            <Topbar onLoad={handleLoad} isLoading={isLoading} onPrint={handlePrint} />
        }>
            {/* Horizontal tab strip — sticky below the topbar */}
            <TabStrip tab={tab} onChange={(key) => dispatch(setActiveTab(key))} />

            <main className="flex-1 overflow-y-auto p-4">
                {!isLoading && <SmartAlerts mis={mis} kpi={kpi} />}
                <AnimatePresence mode="wait">
                    {isError ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[60vh]">
                            <EmptyState
                                icon={RefreshCw}
                                title="Failed to load report"
                                description="No data found for the selected branch and date. Try uploading data first."
                                action={
                                    <button onClick={() => handleLoad()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-[13px] font-600 rounded-lg hover:bg-blue-100 transition-all cursor-pointer border border-blue-200">
                                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                                    </button>
                                }
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                        >
                            {tabContent()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </AppLayout>
    );
}
