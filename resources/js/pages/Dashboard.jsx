import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
    LayoutDashboard, TrendingUp, BarChart3, PieChart as PieIcon,
    BedDouble, Scissors, Users, Wallet, Package, Stethoscope,
    CreditCard, HeartPulse, ShoppingBag, Activity, Star,
    RefreshCw,
} from 'lucide-react';
import { selectToken } from '../store/authSlice';
import {
    selectBranch as selBranch, selectActiveTab,
    selectGlobalFrom, selectGlobalTo, setActiveTab,
} from '../store/reportSlice';
import { useDashboard } from '../hooks/useDashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { Section } from '../components/ui/Section';
import { Topbar } from '../components/layout/Topbar';
import { TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { RankedList, PayerChips } from '../components/ui/RankedList';
import { KPIStrip } from '../components/ui/KPIStrip';
import { QuickActions } from '../components/ui/QuickActions';
import { SmartAlerts } from '../components/ui/SmartAlerts';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import EChart from '../components/ui/EChart';
import {
    AdmissionsChart, DeptRevenueChart, PharmacyTrendChart,
    BedOccupancyChart, RevenueTrendChart,
    PatientMixChartE as PatientMixChart,
    PayerChartE as PayerChart,
} from '../components/ui/DashboardCharts';
import { fmtL, fmtRupee, fmtPct, toLakhs, cfClass } from '../utils/formatters';
import { CHART_PALETTE } from '../constants';
import { misApi } from '../services/api';
import { cn } from '../utils/cn';

// ── Dashboard tab definitions ─────────────────────────────────────────────────
const TABS = [
    { key: 'overview',   label: 'Overview',    icon: LayoutDashboard },
    { key: 'revenue',    label: 'Revenue',     icon: TrendingUp      },
    { key: 'volume',     label: 'Volume',      icon: BarChart3       },
    { key: 'analytics',  label: 'Analytics',   icon: PieIcon         },
    { key: 'ip',         label: 'IP',          icon: BedDouble       },
    { key: 'surgery',    label: 'Surgery',     icon: Scissors        },
    { key: 'op',         label: 'OP',          icon: Users           },
    { key: 'collection', label: 'Collection',  icon: Wallet          },
    { key: 'service',    label: 'Service Mix', icon: Package         },
    { key: 'doctors',    label: 'Doctors',     icon: Stethoscope     },
];

// ── Static color map (prevents Tailwind JIT from purging dynamic class names) ─
const STAT_CLS = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700'   },
    violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
    slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-700'  },
    cyan:   { bg: 'bg-cyan-50',   border: 'border-cyan-100',   text: 'text-cyan-700'   },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-700'  },
    red:    { bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-700'    },
    green:  { bg: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-700'  },
};

const SERVICE_COLORS = ['#1d4ed8','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e'];

// Shared ECharts axis / tooltip defaults used in this file
const EAXIS = { axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f1f5f9' } } };
const TT    = { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { fontSize: 11 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)' };


// ── Revenue table ──────────────────────────────────────────────────────────────
const REV_ROWS = [
    { key: 'op',      label: 'OP Revenue'  },
    { key: 'ip',      label: 'IP Revenue'  },
    { key: 'er',      label: 'ER Revenue'  },
    { key: 'ph',      label: 'Pharmacy'    },
    { key: 'pkg',     label: 'Packages'    },
    { key: 'mri_rev', label: 'MRI / Scan'  },
];

const RevenueTable = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={7} cols={4} />;
    if (!mis) return <EmptyState title="No revenue data" description="Load a report to see revenue breakdown." />;
    const salesFtd = mis.sales?.ftd || {};
    const salesMtd = mis.sales?.mtd || {};
    const ftd = {
        ...salesFtd,
        pkg:     mis.pkg_adjustment?.ftd != null ? mis.pkg_adjustment.ftd : undefined,
        mri_rev: mis.mri ? (mis.mri.ftd?.op?.revenue ?? 0) + (mis.mri.ftd?.ip?.revenue ?? 0) : undefined,
    };
    const mtd = {
        ...salesMtd,
        pkg:     mis.pkg_adjustment?.mtd != null ? mis.pkg_adjustment.mtd : undefined,
        mri_rev: mis.mri ? (mis.mri.mtd?.op?.revenue ?? 0) + (mis.mri.mtd?.ip?.revenue ?? 0) : undefined,
    };
    const rows    = REV_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined);
    const totFtd  = rows.reduce((a, r) => a + (Number(ftd[r.key] ?? 0) || 0), 0);
    const totMtd  = rows.reduce((a, r) => a + (Number(mtd[r.key] ?? 0) || 0), 0);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th scope="col" className="pb-2 pr-4 font-700">Category</th>
                        <th scope="col" className="pb-2 pr-4 text-right font-700">FTD (₹)</th>
                        <th scope="col" className="pb-2 pr-4 text-right font-700">FTD (L)</th>
                        <th scope="col" className="pb-2 text-right font-700">MTD (L)</th>
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
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totFtd))}`}>{fmtRupee(totFtd)}</td>
                        <td className={`py-2.5 pr-4 text-right ${cfClass(toLakhs(totFtd))}`}>{fmtL(totFtd)}</td>
                        <td className="py-2.5 text-right text-slate-600">{fmtL(totMtd)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// ── Volume grid ────────────────────────────────────────────────────────────────
const VOLUME_ROWS = [
    { key: 'total_op',      label: 'OP Visits'     },
    { key: 'ip_count',      label: 'IP Patients'   },
    { key: 'er_count',      label: 'ER Patients'   },
    { key: 'admission',     label: 'Admissions'    },
    { key: 'discharge',     label: 'Discharges'    },
    { key: 'surgery_count', label: 'Surgeries'     },
    { key: 'mri_count',     label: 'MRI / Scans'   },
    { key: 'occupancy',     label: 'Beds Occupied' },
    { key: 'occupancy_pct', label: 'Occupancy %'   },
];

const VolumeGrid = ({ mis, kpi, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={3} />;
    if (!mis) return <EmptyState title="No volume data" />;
    const volFtd = mis.volume?.ftd || {};
    const volMtd = mis.volume?.mtd || {};
    const mriF   = mis.mri?.ftd;
    const mriM   = mis.mri?.mtd;
    const ftd = {
        ...volFtd,
        ip_count:      kpi?.ip_count      != null ? kpi.ip_count      : undefined,
        surgery_count: kpi?.surgery_count  != null ? kpi.surgery_count  : undefined,
        mri_count:     mriF               != null ? (mriF.op?.count ?? 0) + (mriF.ip?.count ?? 0) : undefined,
    };
    const mtd = {
        ...volMtd,
        ip_count:      volMtd.admission      != null ? volMtd.admission      : undefined,
        surgery_count: volMtd.surgery_count  != null ? volMtd.surgery_count  : undefined,
        mri_count:     mriM                  != null ? (mriM.op?.count ?? 0) + (mriM.ip?.count ?? 0) : undefined,
    };
    const fmtCell = (key, v) => {
        if (v === null) return <span className="text-slate-400 italic text-[11px]">N/A</span>;
        if (key === 'occupancy_pct') return <span>{fmtPct(v)}</span>;
        return <span>{(v ?? 0).toLocaleString()}</span>;
    };
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th scope="col" className="pb-2 pr-4 font-700">Metric</th>
                        <th scope="col" className="pb-2 pr-4 text-right font-700">FTD</th>
                        <th scope="col" className="pb-2 text-right font-700">MTD</th>
                    </tr>
                </thead>
                <tbody>
                    {VOLUME_ROWS.filter(r => ftd[r.key] !== undefined || mtd[r.key] !== undefined).map(({ key, label }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-2 pr-4 font-500 text-slate-700">{label}</td>
                            <td className="py-2 pr-4 text-right font-700 text-blue-700">{fmtCell(key, ftd[key])}</td>
                            <td className="py-2 text-right font-600 text-slate-500">{fmtCell(key, mtd[key])}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Stat box (shared across IP, Surgery, OP tabs) ──────────────────────────────
const StatBox = ({ label, value, color = 'blue' }) => {
    const cls = STAT_CLS[color] || STAT_CLS.blue;
    return (
        <div className={`${cls.bg} border ${cls.border} rounded-xl p-2.5 text-center`}>
            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
            <div className={`text-[18px] font-800 ${cls.text} tabular-nums`}>{value ?? 0}</div>
        </div>
    );
};

// ── IP Demographics ────────────────────────────────────────────────────────────
const IPDemographics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={4} />;
    if (!data || data.total === 0) return <EmptyState title="No IP admission data" description="Upload the IP admission CSV file to see demographics." />;
    const {
        by_gender = [], by_payer_type = [], by_ward = [], by_room = [],
        by_speciality = [], by_source = [], by_discharge_type = [], top_doctors = [],
    } = data;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <StatBox label="Total IP"    value={data.total}          color="blue"   />
                <StatBox label="Discharged"  value={data.discharge_count} color="green" />
                <StatBox label="Below 18"    value={data.age_below_18}   color="violet" />
                <StatBox label="18+ Years"   value={data.age_18_plus}    color="slate"  />
                <StatBox label="Avg LOS"     value={data.avg_los_days ? `${data.avg_los_days}d` : 0} color="cyan" />
                <StatBox label="MLC"         value={data.mlc_count}      color="amber"  />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox label="Deaths"          value={data.death_count}     color="red"    />
                <StatBox label="Planned Disch."  value={data.planned_discharge} color="teal" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {by_gender.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Gender</p><RankedList items={by_gender} nameKey="gender" valueKey="count" barColor="#1d4ed8" /></div>}
                {by_payer_type.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Payer</p><RankedList items={by_payer_type} nameKey="payer_type" valueKey="count" barColor="#7c3aed" /></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {by_ward.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Ward</p><RankedList items={by_ward.slice(0, 8)} nameKey="ward" valueKey="count" barColor="#059669" /></div>}
                {by_speciality.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Speciality</p><RankedList items={by_speciality.slice(0, 8)} nameKey="speciality" valueKey="count" barColor="#0891b2" /></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {by_source.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Source</p><RankedList items={by_source.slice(0, 8)} nameKey="source" valueKey="count" barColor="#d97706" /></div>}
                {by_discharge_type.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Discharge Type</p><RankedList items={by_discharge_type.slice(0, 8)} nameKey="discharge_type" valueKey="count" barColor="#dc2626" /></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {by_room.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Room</p><RankedList items={by_room.slice(0, 8)} nameKey="room" valueKey="count" barColor="#6d28d9" /></div>}
                {top_doctors.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors</p><RankedList items={top_doctors.slice(0, 8)} nameKey="doctor" valueKey="count" barColor="#d97706" /></div>}
            </div>
        </div>
    );
};

// ── Surgery Detail ─────────────────────────────────────────────────────────────
const SurgeryDetail = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={4} />;
    if (!data || data.total === 0) return <EmptyState title="No surgery data" description="Upload the surgery CSV file to see details." />;
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {by_surgeon.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Surgeon</p><RankedList items={by_surgeon.slice(0, 10)} nameKey="surgeon" valueKey="count" barColor="#1d4ed8" /></div>}
                {by_dept.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p><RankedList items={by_dept.slice(0, 10)} nameKey="dept" valueKey="count" barColor="#7c3aed" /></div>}
            </div>
            {by_ot_room.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By OT Room</p><RankedList items={by_ot_room} nameKey="ot_name" valueKey="count" barColor="#059669" /></div>}
        </div>
    );
};

// ── OP Metrics ─────────────────────────────────────────────────────────────────
const OPMetrics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={3} />;
    if (!data) return <EmptyState title="No OP metrics" />;
    const topDoctors = data.top_doctors || data.by_doctor || [];
    const byDept     = data.by_dept     || [];
    const byGender   = data.by_gender   || [];
    const byPayer    = data.by_payer_type || [];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const stats = [
        ['Total Visits',    data.total_visits    ?? 0,          'blue'],
        ['Unique Patients', data.unique_patients ?? 0,          'violet'],
        ['Total Revenue',   fmt(data.total_revenue),            'green'],
        ['Discount',        fmt(data.total_discount),           'amber'],
    ];
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map(([label, val, color]) => {
                    const cls = STAT_CLS[color] || STAT_CLS.blue;
                    return (
                        <div key={label} className={`${cls.bg} border ${cls.border} rounded-xl p-2.5 text-center`}>
                            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                            <div className={`text-[16px] font-800 ${cls.text}`}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
                        </div>
                    );
                })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topDoctors.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors</p><RankedList items={topDoctors} nameKey="doctor" valueKey="visits" barColor="#059669" /></div>}
                {byDept.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p><RankedList items={byDept} nameKey="dept" valueKey="visits" barColor="#7c3aed" /></div>}
            </div>
            {(byGender.length > 0 || byPayer.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {byGender.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Gender</p><RankedList items={byGender} nameKey="gender" valueKey="visits" barColor="#0891b2" /></div>}
                    {byPayer.length > 0 && <div><p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Payer Type</p><RankedList items={byPayer} nameKey="payer_type" valueKey="visits" barColor="#d97706" /></div>}
                </div>
            )}
        </div>
    );
};

// ── Collection Tab ─────────────────────────────────────────────────────────────
const CollectionTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No collection data" description="Upload a cashier collection file to see payment analytics." />;

    const byMode = data.payment_modes  || data.by_payment_mode || [];
    const byType = data.by_patient_type || [];
    const byTxn  = data.by_category    || data.by_transaction_category || [];
    const daily  = data.daily_trend    || [];
    const total  = data.total_collection || 0;
    const fmt    = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const summaryStats = [
        ['blue',   'Total Collection', fmt(total)],
        ['green',  'Cash',             fmt(byMode.find(m => m.mode === 'Cash')?.amount)],
        ['violet', 'Digital',          fmt(byMode.find(m => /UPI|Digital/i.test(m.mode))?.amount)],
        ['amber',  'TPA',              fmt(byMode.find(m => /TPA/i.test(m.mode))?.amount)],
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {summaryStats.map(([color, label, val]) => {
                    const cls = STAT_CLS[color] || STAT_CLS.blue;
                    return (
                        <div key={label} className={`${cls.bg} border ${cls.border} rounded-xl p-3`}>
                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">{label}</div>
                            <div className={`text-[1.05rem] font-800 ${cls.text}`}>{val || '₹0'}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Payment Mode Breakdown" icon={Wallet}>
                    {byMode.length ? (
                        <>
                            <EChart height={180} option={{
                                tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmt(p.value)} (${p.percent}%)`, ...TT },
                                series: [{
                                    type: 'pie', radius: ['40%', '68%'], center: ['50%', '50%'],
                                    data: byMode.map((m, i) => ({ name: m.mode, value: m.amount, itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] } })),
                                    label: { show: false },
                                    itemStyle: { borderWidth: 2, borderColor: '#fff' },
                                }],
                            }} />
                            <div className="space-y-1.5 mt-2">
                                {byMode.map((m, i) => (
                                    <div key={m.mode || i} className="flex items-center justify-between text-[12px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
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
                    {byType.length
                        ? <RankedList items={byType} nameKey="patient_type" valueKey="amount" barColor="#1d4ed8" valueFormat={fmt} />
                        : <EmptyState title="No patient type data" />
                    }
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
                    <EChart height={200} option={{
                        grid: { top: 4, right: 8, bottom: 24, left: 56 },
                        tooltip: { trigger: 'axis', formatter: p => `${p[0].axisValue}<br/>Collection: ${fmt(p[0].value)}`, ...TT },
                        xAxis: { type: 'category', data: daily.map(d => (d.day || d.date)?.slice(5)), axisLabel: { fontSize: 10, color: '#94a3b8' }, ...EAXIS },
                        yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${(v / 1000).toFixed(0)}k` }, ...EAXIS },
                        series: [{
                            type: 'line', data: daily.map(d => d.amount || 0), smooth: 0.3,
                            symbol: 'none', lineStyle: { color: '#1d4ed8', width: 2 },
                            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(29,78,216,0.18)' }, { offset: 1, color: 'rgba(29,78,216,0)' }] } },
                        }],
                    }} />
                </Section>
            )}
        </div>
    );
};

// ── Service Mix Tab ────────────────────────────────────────────────────────────
const ServiceMixTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No service data" description="Upload bill items file to see service mix analytics." />;

    const byType   = data.by_service_type || [];
    const byPtype  = data.by_patient_type || [];
    const topItems = data.top_items       || [];
    const byDept   = data.by_department   || [];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3"><div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Revenue</div><div className="text-[1.05rem] font-800 text-blue-700">{fmt(data.total_revenue)}</div></div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3"><div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Discount</div><div className="text-[1.05rem] font-800 text-red-600">{fmt(data.total_discount)}</div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Revenue by Service Type" icon={BarChart3}>
                    {byType.length ? (
                        <EChart height={220} option={{
                            grid: { top: 4, right: 70, bottom: 8, left: 96 },
                            tooltip: { trigger: 'axis', valueFormatter: v => fmt(v), ...TT },
                            xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: v => `₹${(v / 1000).toFixed(0)}k` }, ...EAXIS },
                            yAxis: { type: 'category', data: byType.map(d => d.service_type), axisLabel: { fontSize: 9, color: '#64748b' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{
                                type: 'bar', data: byType.map(d => d.revenue), barMaxWidth: 16,
                                itemStyle: { borderRadius: [0, 4, 4, 0] },
                                colorBy: 'data', color: SERVICE_COLORS,
                                label: { show: true, position: 'right', formatter: p => fmt(p.value), fontSize: 9, color: '#64748b' },
                            }],
                        }} />
                    ) : <EmptyState title="No service type data" />}
                </Section>

                <Section title="Revenue by Patient Type" icon={Users}>
                    {byPtype.length
                        ? <RankedList items={byPtype} nameKey="patient_type" valueKey="revenue" barColor="#7c3aed" valueFormat={fmt} />
                        : <EmptyState title="No patient type data" />
                    }
                    {byDept.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Departments</p>
                            <RankedList items={byDept.slice(0, 6)} nameKey="department" valueKey="revenue" barColor="#059669" valueFormat={fmt} />
                        </div>
                    )}
                </Section>
            </div>

            {topItems.length > 0 && (
                <Section title="Top Revenue Items" icon={Star}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th scope="col" className="pb-1.5 pr-3">#</th>
                                    <th scope="col" className="pb-1.5 pr-3">Item</th>
                                    <th scope="col" className="pb-1.5 pr-3">Type</th>
                                    <th scope="col" className="pb-1.5 pr-3 text-right">Revenue</th>
                                    <th scope="col" className="pb-1.5 text-right">Count</th>
                                </tr>
                            </thead>
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

// ── Doctor Performance Tab ─────────────────────────────────────────────────────
const DoctorPerfTab = ({ data, isLoading }) => {
    const [sortKey, setSortKey] = useState('total_revenue');
    if (isLoading) return <TableSkeleton rows={10} cols={6} />;
    if (!data) return <EmptyState title="No doctor performance data" description="Upload bill items with doctor data." />;
    const doctors      = [...(data.doctors || [])].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    const bySpeciality = data.by_speciality || [];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const cols = [
        { key: 'total_revenue',   label: 'Revenue'   },
        { key: 'unique_patients', label: 'Patients'  },
        { key: 'visit_count',     label: 'Visits'    },
        { key: 'ip_admissions',   label: 'IP Adm.'   },
        { key: 'surgeries',       label: 'Surgeries' },
    ];
    return (
        <div className="space-y-4">
            {bySpeciality.length > 0 && (
                <Section title="Revenue by Speciality" icon={Stethoscope}>
                    <RankedList items={bySpeciality.slice(0, 8)} nameKey="speciality" valueKey="revenue" barColor="#1d4ed8" valueFormat={fmt} />
                </Section>
            )}
            <Section title="Doctor Performance" icon={Users} action={
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Sort:</span>
                    <select
                        value={sortKey}
                        onChange={e => setSortKey(e.target.value)}
                        aria-label="Sort doctor table by metric"
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 bg-white cursor-pointer outline-none focus:border-blue-400"
                    >
                        {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
            }>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                <th scope="col" className="pb-1.5 pr-3">#</th>
                                <th scope="col" className="pb-1.5 pr-3">Doctor</th>
                                <th scope="col" className="pb-1.5 pr-3">Speciality</th>
                                {cols.map(c => (
                                    <th
                                        key={c.key}
                                        scope="col"
                                        onClick={() => setSortKey(c.key)}
                                        aria-sort={sortKey === c.key ? 'descending' : 'none'}
                                        className={`pb-1.5 pr-3 text-right cursor-pointer hover:text-slate-600 transition-colors ${sortKey === c.key ? 'text-blue-600' : ''}`}
                                    >
                                        {c.label}
                                    </th>
                                ))}
                                <th scope="col" className="pb-1.5 text-right">Avg LOS</th>
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

// ── Analytics Tab ──────────────────────────────────────────────────────────────
const AnalyticsTab = ({ payer, mix, isPayerLoading, isMixLoading }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Payer Mix Breakdown" icon={PieIcon}>
                <PayerChart data={payer} isLoading={isPayerLoading} />
                {!isPayerLoading && payer?.length > 0 && (
                    <div className="mt-3"><PayerChips items={payer} nameKey="payer_type" countKey="transactions" /></div>
                )}
            </Section>
            <Section title="Patient Mix Trend" icon={Users}>
                <PatientMixChart data={mix} isLoading={isMixLoading} />
            </Section>
        </div>
    </div>
);

// ── Overview Tab ───────────────────────────────────────────────────────────────
const OverviewTab = ({
    mis, kpi, trend, payer, mix, collection, serviceRev, admissions,
    isLoading, isTrendLoading, isPayerLoading, isMixLoading, isAdmLoading,
}) => {
    const ftdVol = mis?.volume?.ftd || {};
    return (
        <div className="space-y-4">
            <KPIStrip mis={mis} kpi={kpi} collection={collection} isLoading={isLoading} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Revenue Trend" icon={TrendingUp}>
                        <RevenueTrendChart data={trend} isLoading={isTrendLoading} />
                    </Section>
                </div>
                <Section title="Payer Mix" icon={PieIcon}>
                    <PayerChart data={payer} isLoading={isPayerLoading} />
                </Section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Patient Trend" icon={Users}>
                    <PatientMixChart data={mix} isLoading={isMixLoading} />
                </Section>
                <Section title="Admissions vs Discharges" icon={Activity}>
                    <AdmissionsChart data={
                        admissions
                            ? [{ date: 'IP', admissions: admissions.ip_total || 0, discharges: 0 },
                               { date: 'ER', admissions: admissions.er_total || 0, discharges: 0 }]
                            : []
                    } isLoading={isAdmLoading} />
                </Section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Department Revenue" icon={BarChart3}>
                        <DeptRevenueChart data={serviceRev} isLoading={isTrendLoading} />
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
                <PharmacyTrendChart data={trend} isLoading={isTrendLoading} />
            </Section>
        </div>
    );
};

// ── Horizontal Tab Strip — WAI-ARIA tablist pattern ───────────────────────────
const TabStrip = ({ tab, onChange }) => {
    const handleKey = useCallback((e, index) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(TABS[Math.min(index + 1, TABS.length - 1)].key); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); onChange(TABS[Math.max(index - 1, 0)].key); }
        if (e.key === 'Home')       { e.preventDefault(); onChange(TABS[0].key); }
        if (e.key === 'End')        { e.preventDefault(); onChange(TABS[TABS.length - 1].key); }
    }, [onChange]);

    return (
        <div role="tablist" aria-label="Dashboard sections" className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-none flex-shrink-0">
            <div className="flex gap-0 min-w-max px-1">
                {TABS.map(({ key, label, icon: Icon }, index) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            role="tab"
                            id={`tab-${key}`}
                            aria-selected={active}
                            aria-controls={`tabpanel-${key}`}
                            tabIndex={active ? 0 : -1}
                            onClick={() => onChange(key)}
                            onKeyDown={(e) => handleKey(e, index)}
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
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
    const token    = useSelector(selectToken);
    const branch   = useSelector(selBranch);
    const date     = useSelector(selectGlobalTo);
    const tab      = useSelector(selectActiveTab);
    const dispatch = useDispatch();
    const effectiveFrom = useSelector(selectGlobalFrom);

    const {
        mis, kpi, trend, payer, mix, serviceRev, admissions,
        ipDemo, surgery, op, collection, doctorPerf,
        isLoading, isTrendLoading, isPayerLoading, isMixLoading,
        isIpLoading, isSurgLoading, isOpLoading, isCollLoading,
        isSvcLoading, isDrLoading, isAdmLoading,
        isError, refetch, dataUpdatedAt,
    } = useDashboard(branch, date, effectiveFrom, tab);

    if (!token) return <Navigate to="/login" replace />;

    const handlePrint = () => window.open(misApi.printPreview(branch, date), '_blank');

    const tabContent = () => {
        switch (tab) {
            case 'overview':
                return (
                    <OverviewTab
                        mis={mis} kpi={kpi} trend={trend} payer={payer} mix={mix}
                        collection={collection} serviceRev={serviceRev} admissions={admissions}
                        isLoading={isLoading}
                        isTrendLoading={isTrendLoading}
                        isPayerLoading={isPayerLoading}
                        isMixLoading={isMixLoading}
                        isAdmLoading={isAdmLoading}
                    />
                );
            case 'revenue':
                return (
                    <div className="space-y-4">
                        <Section title="Revenue Breakdown" icon={CreditCard}><RevenueTable mis={mis} isLoading={isLoading} /></Section>
                        <Section title="Daily Revenue Trend" icon={TrendingUp}><RevenueTrendChart data={trend} isLoading={isTrendLoading} /></Section>
                    </div>
                );
            case 'volume':
                return (
                    <div className="space-y-4">
                        <Section title="Volume & MRI Metrics" icon={BarChart3}><VolumeGrid mis={mis} kpi={kpi} isLoading={isLoading} /></Section>
                        <Section title="Patient Volume Trend" icon={Users}><PatientMixChart data={mix} isLoading={isMixLoading} /></Section>
                    </div>
                );
            case 'analytics':  return <AnalyticsTab payer={payer} mix={mix} isPayerLoading={isPayerLoading} isMixLoading={isMixLoading} />;
            case 'ip':         return <Section title="IP Admissions & Demographics" icon={BedDouble}><IPDemographics data={ipDemo} isLoading={isIpLoading} /></Section>;
            case 'surgery':    return <Section title="Surgery Analytics" icon={Scissors}><SurgeryDetail data={surgery} isLoading={isSurgLoading} /></Section>;
            case 'op':         return <Section title="OP Metrics" icon={Users}><OPMetrics data={op} isLoading={isOpLoading} /></Section>;
            case 'collection': return <CollectionTab data={collection} isLoading={isCollLoading} />;
            case 'service':    return <ServiceMixTab data={serviceRev} isLoading={isSvcLoading} />;
            case 'doctors':    return <DoctorPerfTab data={doctorPerf} isLoading={isDrLoading} />;
            default:           return null;
        }
    };

    return (
        <AppLayout topbar={<Topbar isLoading={isLoading} onPrint={handlePrint} dataUpdatedAt={dataUpdatedAt} />}>
            {/* Horizontal tab strip sticky below topbar */}
            <TabStrip tab={tab} onChange={(key) => dispatch(setActiveTab(key))} />

            <main
                role="tabpanel"
                id={`tabpanel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4"
            >
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
                                    <button onClick={() => refetch()}
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
                            <ErrorBoundary key={tab}>
                                {tabContent()}
                            </ErrorBoundary>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </AppLayout>
    );
}
