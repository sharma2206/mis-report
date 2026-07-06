import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { selectToken } from '../store/authSlice';
import {
    selectBranch as selBranch, selectDate as selDate, selectActiveTab,
    selectPeriodMode, selectPeriodFrom, selectPeriodTo,
} from '../store/reportSlice';
import { useDashboard } from '../hooks/useDashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { Topbar } from '../components/layout/Topbar';
import { KPISkeleton, TableSkeleton, ChartSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { RankedList, PayerChips } from '../components/ui/RankedList';
import { KPIStrip } from '../components/ui/KPIStrip';
import { QuickActions } from '../components/ui/QuickActions';
import { SmartAlerts } from '../components/ui/SmartAlerts';
import { AdmissionsChart, DeptRevenueChart, PharmacyTrendChart, BedOccupancyChart } from '../components/ui/DashboardCharts';
import { fmtL, fmtRupee, fmtPct, toLakhs, cfClass } from '../utils/formatters';
import { CHART_PALETTE } from '../constants';
import { misApi } from '../services/api';
import { cn } from '../utils/cn';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ label, ftd, mtd, icon: Icon, color = 'blue', format = 'rupee' }) => {
    const fmt = (v) => format === 'rupee' ? fmtL(v) : format === 'pct' ? fmtPct(v) : String(v ?? 0);
    const colors = {
        blue:   'from-blue-500 to-blue-700',
        green:  'from-emerald-500 to-emerald-700',
        violet: 'from-violet-500 to-violet-700',
        amber:  'from-amber-500 to-amber-700',
        red:    'from-red-500 to-red-700',
        cyan:   'from-cyan-500 to-cyan-700',
    };
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    {Icon && <Icon className="w-4 h-4 text-white" />}
                </div>
                <Badge variant={color === 'green' ? 'green' : color === 'amber' ? 'amber' : 'blue'}>FTD</Badge>
            </div>
            <p className="text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-[1.35rem] font-800 text-slate-900 leading-none mb-1">{fmt(ftd)}</p>
            {mtd !== undefined && (
                <p className="text-[11px] text-slate-400">MTD <span className="font-600 text-slate-600">{fmt(mtd)}</span></p>
            )}
        </motion.div>
    );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, children, action }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <span className="text-[12px] font-700 uppercase tracking-wider text-slate-500">{title}</span>
            {action && <div className="ml-auto">{action}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ─── Revenue Table ────────────────────────────────────────────────────────────
const REV_ROWS = [
    { key: 'op',        label: 'OP Revenue' },
    { key: 'ip',        label: 'IP Revenue' },
    { key: 'er',        label: 'ER Revenue' },
    { key: 'pharmacy',  label: 'Pharmacy' },
    { key: 'packages',  label: 'Packages' },
    { key: 'mri',       label: 'MRI / Scan' },
];

const RevenueTable = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={8} cols={4} />;
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
                    <tr className="font-700 bg-slate-50 border-t-2 border-slate-200">
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

// ─── Volume Grid ──────────────────────────────────────────────────────────────
const VOLUME_ROWS = [
    { key: 'op_count',      label: 'OP Patients' },
    { key: 'ip_count',      label: 'IP Patients' },
    { key: 'er_count',      label: 'ER Patients' },
    { key: 'admission',     label: 'Admissions' },
    { key: 'discharge',     label: 'Discharges' },
    { key: 'pharmacy_bills',label: 'Pharmacy Bills' },
    { key: 'package_count', label: 'Packages' },
    { key: 'mri_count',     label: 'MRI / Scans' },
    { key: 'surgery_count', label: 'Surgeries' },
    { key: 'occupancy',     label: 'Beds Occupied' },
    { key: 'occupancy_pct', label: 'Occupancy %' },
];

const VolumeGrid = ({ mis, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={3} />;
    if (!mis) return <EmptyState title="No volume data" />;
    const ftd = mis.volume?.ftd || {};
    const mtd = mis.volume?.mtd || {};
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
                            <td className="py-2 pr-4 text-right font-700 text-blue-700">
                                {key === 'occupancy_pct' ? fmtPct(ftd[key]) : (ftd[key] ?? 0).toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-slate-500 font-600">
                                {key === 'occupancy_pct' ? fmtPct(mtd[key]) : (mtd[key] ?? 0).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Daily Trend Chart ────────────────────────────────────────────────────────
const TrendChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={240} />;
    if (!data?.length) return <EmptyState title="No trend data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        ftd: toLakhs(d.total_revenue || d.ftd_revenue),
        op:  toLakhs(d.op_revenue),
        ip:  toLakhs(d.ip_revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
                <Tooltip formatter={(v, n) => [`₹${v}L`, n.toUpperCase()]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="ftd" stroke="#1d4ed8" fill="url(#gradTotal)" strokeWidth={2} dot={false} name="Total" />
                <Area type="monotone" dataKey="op" stroke="#059669" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="OP" />
                <Area type="monotone" dataKey="ip" stroke="#7c3aed" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="IP" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Payer Mix Chart ──────────────────────────────────────────────────────────
const PayerChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No payer data" />;
    const chartData = data.slice(0, 8).map(d => ({
        name: d.payer_name || d.payer || 'Unknown',
        value: toLakhs(d.amount || d.total_amount),
    }));
    return (
        <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" strokeWidth={1} stroke="#fff">
                        {chartData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`₹${v}L`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
                {chartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[12px]">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="text-slate-600 flex-1 truncate">{d.name}</span>
                        <span className="font-700 text-slate-800">₹{d.value}L</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Patient Mix Bar Chart ────────────────────────────────────────────────────
const PatientMixChart = ({ data, isLoading }) => {
    if (isLoading) return <ChartSkeleton height={200} />;
    if (!data?.length) return <EmptyState title="No patient mix data" />;
    const chartData = data.map(d => ({
        date: d.date?.slice(5) || d.date,
        OP: d.op_count || 0,
        IP: d.ip_count || 0,
        ER: d.er_count || 0,
    }));
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="OP" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="IP" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ER" fill="#d97706" radius={[2, 2, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── IP Demographics ──────────────────────────────────────────────────────────
const IPDemographics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={4} />;
    if (!data) return <EmptyState title="No IP demographics data" />;
    const admissions = data.admissions || [];
    const ageGroups  = data.age_groups || data.ageGroups || [];
    return (
        <div className="space-y-4">
            {admissions.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Recent Admissions</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th className="pb-1.5 pr-3">Patient</th>
                                    <th className="pb-1.5 pr-3">Ward</th>
                                    <th className="pb-1.5 pr-3">Doctor</th>
                                    <th className="pb-1.5 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admissions.slice(0, 8).map((a, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-1.5 pr-3 font-600 text-slate-700">{a.patient_name || a.name}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{a.ward || a.room || '—'}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{a.doctor_name || a.doctor || '—'}</td>
                                        <td className="py-1.5 text-right text-slate-400">{a.admission_date?.slice(5) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {ageGroups.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Age Distribution</p>
                    <div className="grid grid-cols-3 gap-2">
                        {ageGroups.map((g, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                <div className="text-[10px] text-slate-500 font-700 mb-0.5">{g.age_group || g.group}</div>
                                <div className="text-[15px] font-800 text-blue-700">{g.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Surgery Detail ───────────────────────────────────────────────────────────
const SurgeryDetail = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={6} cols={4} />;
    if (!data) return <EmptyState title="No surgery data" description="Upload a surgery file to see details." />;
    const surgeries = data.surgeries || data.list || [];
    const bySurgeon = data.by_surgeon || data.bySurgeon || [];
    return (
        <div className="space-y-4">
            {bySurgeon.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Surgeon</p>
                    <RankedList items={bySurgeon} nameKey="surgeon_name" valueKey="count" barColor="#1d4ed8" />
                </div>
            )}
            {surgeries.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Recent Surgeries</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th className="pb-1.5 pr-3">Patient</th>
                                    <th className="pb-1.5 pr-3">Procedure</th>
                                    <th className="pb-1.5 pr-3">Surgeon</th>
                                    <th className="pb-1.5 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {surgeries.slice(0, 10).map((s, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-1.5 pr-3 font-600 text-slate-700">{s.patient_name || s.patient}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{s.procedure_name || s.procedure}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{s.surgeon_name || s.surgeon}</td>
                                        <td className="py-1.5 text-right text-slate-400">{s.surgery_date?.slice(5) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!bySurgeon.length && !surgeries.length && (
                <EmptyState title="No surgeries recorded" description="No surgeries found for selected date." />
            )}
        </div>
    );
};

// ─── OP Metrics ───────────────────────────────────────────────────────────────
const OPMetrics = ({ data, isLoading }) => {
    if (isLoading) return <TableSkeleton rows={5} cols={3} />;
    if (!data) return <EmptyState title="No OP metrics" />;
    const byDoctor  = data.by_doctor  || data.byDoctor  || [];
    const byDept    = data.by_dept    || data.byDept    || [];
    const summary   = data.summary    || {};
    return (
        <div className="space-y-4">
            {Object.keys(summary).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {[
                        ['Total OPs',    summary.total_op || summary.op_count || 0],
                        ['New Patients', summary.new_patients || 0],
                        ['Reviews',      summary.review_patients || summary.reviews || 0],
                    ].map(([label, val]) => (
                        <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                            <div className="text-[10px] font-700 text-slate-500 uppercase mb-0.5">{label}</div>
                            <div className="text-[1.1rem] font-800 text-blue-700">{(val).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
            {byDoctor.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Doctors by OP Count</p>
                    <RankedList items={byDoctor} nameKey="doctor_name" valueKey="op_count" barColor="#059669" />
                </div>
            )}
            {byDept.length > 0 && (
                <div>
                    <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Department</p>
                    <RankedList items={byDept} nameKey="dept_name" valueKey="patient_count" barColor="#7c3aed" />
                </div>
            )}
        </div>
    );
};

// ─── Overview KPI strip ───────────────────────────────────────────────────────
import {
    TrendingUp, CreditCard, BedDouble, Users, Stethoscope,
    Package, ShoppingBag, Scan, Activity,
} from 'lucide-react';

const OverviewTab = ({ mis, kpi, trend, payer, mix, collection, serviceRev, admissions, isLoading }) => {
    const ftdVol = mis?.volume?.ftd || {};

    return (
        <div className="space-y-4">
            {/* 15-card KPI Strip */}
            <KPIStrip mis={mis} kpi={kpi} collection={collection} isLoading={isLoading} />

            {/* Row 1: Revenue Trend + Payer Mix */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Revenue Trend">
                        <TrendChart data={trend} isLoading={isLoading} />
                    </Section>
                </div>
                <div>
                    <Section title="Payer Mix">
                        <PayerChart data={payer} isLoading={isLoading} />
                    </Section>
                </div>
            </div>

            {/* Row 2: Patient Trend + Admissions vs Discharges */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Patient Trend">
                    <PatientMixChart data={mix} isLoading={isLoading} />
                </Section>
                <Section title="Admissions vs Discharges">
                    <AdmissionsChart data={admissions?.admissions || admissions?.list || admissions || []} isLoading={isLoading} />
                </Section>
            </div>

            {/* Row 3: Dept Revenue + Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Section title="Department Revenue">
                        <DeptRevenueChart data={serviceRev} isLoading={isLoading} />
                    </Section>
                </div>
                <div className="space-y-4">
                    <QuickActions />
                    <Section title="Bed Occupancy">
                        <BedOccupancyChart data={[]} occupancyPct={ftdVol.occupancy_pct} isLoading={isLoading} />
                    </Section>
                </div>
            </div>

            {/* Row 4: Pharmacy Trend */}
            <Section title="Pharmacy Revenue Trend">
                <PharmacyTrendChart data={trend} isLoading={isLoading} />
            </Section>
        </div>
    );
};

// ─── Analytics Tab ────────────────────────────────────────────────────────────
const AnalyticsTab = ({ payer, mix, isLoading }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="Payer Mix Breakdown">
                <PayerChart data={payer} isLoading={isLoading} />
                {!isLoading && payer?.length > 0 && (
                    <div className="mt-3">
                        <PayerChips items={payer} nameKey="payer_name" countKey="patient_count" />
                    </div>
                )}
            </Section>
            <Section title="Patient Mix Trend">
                <PatientMixChart data={mix} isLoading={isLoading} />
            </Section>
        </div>
    </div>
);

// ─── Collection Tab ───────────────────────────────────────────────────────────
const PAYMENT_COLORS = ['#1d4ed8','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];

const CollectionTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No collection data" description="Upload a cashier collection file to see payment analytics." />;

    const byMode   = data.by_payment_mode || [];
    const byType   = data.by_patient_type || [];
    const byTxn    = data.by_transaction_category || [];
    const daily    = data.daily_trend || [];
    const total    = data.total_collection || 0;

    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    ['Total Collection', fmt(total), 'blue'],
                    ['Cash',     fmt(byMode.find(m => m.mode === 'Cash')?.total),         'green'],
                    ['Digital',  fmt(byMode.find(m => /UPI|Digital/i.test(m.mode))?.total), 'violet'],
                    ['TPA',      fmt(byMode.find(m => /TPA/i.test(m.mode))?.total),       'amber'],
                ].map(([label, val, color]) => (
                    <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
                        <div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">{label}</div>
                        <div className={`text-[1.1rem] font-800 text-${color}-700`}>{val || '₹0'}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Payment Mode Breakdown">
                    {byMode.length ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={byMode} dataKey="total" nameKey="mode" cx="50%" cy="50%" outerRadius={70} label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                        {byMode.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {byMode.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between text-[12px]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                                            <span className="text-slate-600 font-500">{m.mode}</span>
                                        </div>
                                        <span className="font-700 text-slate-700">{fmt(m.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : <EmptyState title="No payment mode data" />}
                </Section>

                <Section title="Collection by Patient Type">
                    {byType.length ? (
                        <RankedList items={byType} nameKey="patient_type" valueKey="total" barColor="#1d4ed8"
                            valueFormat={(v) => fmt(v)} />
                    ) : <EmptyState title="No patient type data" />}
                    {byTxn.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">By Transaction Type</p>
                            <RankedList items={byTxn} nameKey="transaction_category" valueKey="total" barColor="#7c3aed"
                                valueFormat={(v) => fmt(v)} />
                        </div>
                    )}
                </Section>
            </div>

            {daily.length > 0 && (
                <Section title="Daily Collection Trend">
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                                tickFormatter={(v) => v?.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => [fmt(v), 'Collection']} labelFormatter={(l) => `Date: ${l}`}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <Area type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2} fill="url(#collGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Section>
            )}
        </div>
    );
};

// ─── Service Mix Tab ──────────────────────────────────────────────────────────
const ServiceMixTab = ({ data, isLoading }) => {
    if (isLoading) return <div className="space-y-4"><ChartSkeleton height={220} /><TableSkeleton rows={6} cols={3} /></div>;
    if (!data) return <EmptyState title="No service data" description="Upload a bill items file to see service mix analytics." />;

    const byType   = data.by_service_type   || [];
    const byPtype  = data.by_patient_type   || [];
    const topItems = data.top_items         || [];
    const byDept   = data.by_department     || [];
    const total    = data.total_revenue     || 0;
    const discount = data.total_discount    || 0;

    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const SERVICE_COLORS = ['#1d4ed8','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e'];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Revenue</div>
                    <div className="text-[1.1rem] font-800 text-blue-700">{fmt(total)}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1">Total Discount</div>
                    <div className="text-[1.1rem] font-800 text-red-600">{fmt(discount)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Section title="Revenue by Service Type">
                    {byType.length ? (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byType} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="service_type" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip formatter={(v) => [fmt(v), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                    <Bar dataKey="total_revenue" radius={[0, 3, 3, 0]}>
                                        {byType.map((_, i) => <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </>
                    ) : <EmptyState title="No service type data" />}
                </Section>

                <Section title="Revenue by Patient Type">
                    {byPtype.length ? (
                        <RankedList items={byPtype} nameKey="patient_type" valueKey="total_revenue" barColor="#7c3aed"
                            valueFormat={(v) => fmt(v)} />
                    ) : <EmptyState title="No patient type data" />}
                    {byDept.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-700 uppercase tracking-wider text-slate-400 mb-2">Top Departments</p>
                            <RankedList items={byDept.slice(0, 6)} nameKey="department" valueKey="total_revenue" barColor="#059669"
                                valueFormat={(v) => fmt(v)} />
                        </div>
                    )}
                </Section>
            </div>

            {topItems.length > 0 && (
                <Section title="Top Revenue Items">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-700 text-slate-400 uppercase text-left border-b border-slate-100">
                                    <th className="pb-1.5 pr-3">#</th>
                                    <th className="pb-1.5 pr-3">Item</th>
                                    <th className="pb-1.5 pr-3">Type</th>
                                    <th className="pb-1.5 pr-3 text-right">Revenue</th>
                                    <th className="pb-1.5 text-right">Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topItems.slice(0, 12).map((item, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-1.5 pr-3 text-slate-400 font-600">{i + 1}</td>
                                        <td className="py-1.5 pr-3 font-600 text-slate-700 max-w-[200px] truncate">{item.item_name}</td>
                                        <td className="py-1.5 pr-3 text-slate-500">{item.service_type}</td>
                                        <td className="py-1.5 pr-3 text-right font-700 text-blue-700">{fmt(item.total_revenue)}</td>
                                        <td className="py-1.5 text-right text-slate-500">{item.count}</td>
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

// ─── Doctor Performance Tab ───────────────────────────────────────────────────
const DoctorPerfTab = ({ data, isLoading }) => {
    const [sortKey, setSortKey] = useState('total_revenue');

    if (isLoading) return <TableSkeleton rows={10} cols={6} />;
    if (!data) return <EmptyState title="No doctor performance data" description="Upload bill items with doctor data to see this report." />;

    const doctors      = [...(data.doctors || [])].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    const bySpeciality = data.by_speciality || [];

    const fmt  = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const cols = [
        { key: 'total_revenue', label: 'Revenue' },
        { key: 'unique_patients', label: 'Patients' },
        { key: 'visit_count', label: 'Visits' },
        { key: 'ip_admissions', label: 'IP Adm.' },
        { key: 'surgeries', label: 'Surgeries' },
    ];

    return (
        <div className="space-y-4">
            {bySpeciality.length > 0 && (
                <Section title="Revenue by Speciality">
                    <RankedList items={bySpeciality.slice(0, 8)} nameKey="speciality" valueKey="total_revenue" barColor="#1d4ed8"
                        valueFormat={(v) => fmt(v)} />
                </Section>
            )}

            <Section title="Doctor Performance" action={
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Sort:</span>
                    <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                        className="text-[11px] border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 bg-white cursor-pointer">
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
                                    <th key={c.key} className={`pb-1.5 pr-3 text-right cursor-pointer hover:text-slate-600 ${sortKey === c.key ? 'text-blue-600' : ''}`}
                                        onClick={() => setSortKey(c.key)}>{c.label}</th>
                                ))}
                                <th className="pb-1.5 text-right">Avg LOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctors.slice(0, 20).map((d, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-1.5 pr-3 text-slate-400 font-600">{i + 1}</td>
                                    <td className="py-1.5 pr-3 font-600 text-slate-700 max-w-[160px] truncate">{d.doctor_name}</td>
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const token      = useSelector(selectToken);
    const branch     = useSelector(selBranch);
    const date       = useSelector(selDate);
    const tab        = useSelector(selectActiveTab);
    const periodMode = useSelector(selectPeriodMode);
    const periodFrom = useSelector(selectPeriodFrom);
    const periodTo   = useSelector(selectPeriodTo);

    const [enabled, setEnabled] = useState(false);
    const [rangeFrom, setRangeFrom] = useState(null);

    const effectiveFrom = periodMode === 'custom' ? periodFrom : rangeFrom;

    const { mis, kpi, trend, payer, mix, ipDemo, surgery, op, collection, serviceRev, doctorPerf, admissions, isLoading, isError, refetch } =
        useDashboard(enabled ? branch : null, enabled ? date : null, enabled ? effectiveFrom : null);

    if (!token) return <Navigate to="/login" replace />;

    const handleLoad = useCallback((from, to) => {
        if (from) setRangeFrom(from);
        setEnabled(true);
        refetch();
    }, [refetch]);

    const handlePrint = () => {
        window.open(misApi.printPreview(branch, date), '_blank');
    };

    const tabContent = () => {
        switch (tab) {
            case 'overview':
                return <OverviewTab mis={mis} kpi={kpi} trend={trend} payer={payer} mix={mix}
                    collection={collection} serviceRev={serviceRev} admissions={admissions} isLoading={isLoading} />;
            case 'revenue':
                return (
                    <div className="space-y-4">
                        <Section title="Revenue Breakdown">
                            <RevenueTable mis={mis} isLoading={isLoading} />
                        </Section>
                        <Section title="Daily Revenue Trend">
                            <TrendChart data={trend} isLoading={isLoading} />
                        </Section>
                    </div>
                );
            case 'volume':
                return (
                    <div className="space-y-4">
                        <Section title="Volume & MRI Metrics">
                            <VolumeGrid mis={mis} isLoading={isLoading} />
                        </Section>
                        <Section title="Patient Volume Trend">
                            <PatientMixChart data={mix} isLoading={isLoading} />
                        </Section>
                    </div>
                );
            case 'analytics':
                return <AnalyticsTab payer={payer} mix={mix} isLoading={isLoading} />;
            case 'ip':
                return (
                    <Section title="IP Admissions & Demographics">
                        <IPDemographics data={ipDemo} isLoading={isLoading} />
                    </Section>
                );
            case 'surgery':
                return (
                    <Section title="Surgery Analytics">
                        <SurgeryDetail data={surgery} isLoading={isLoading} />
                    </Section>
                );
            case 'op':
                return (
                    <Section title="OP Metrics">
                        <OPMetrics data={op} isLoading={isLoading} />
                    </Section>
                );
            case 'collection':
                return <CollectionTab data={collection} isLoading={isLoading} />;
            case 'service':
                return <ServiceMixTab data={serviceRev} isLoading={isLoading} />;
            case 'doctors':
                return <DoctorPerfTab data={doctorPerf} isLoading={isLoading} />;
            default:
                return null;
        }
    };

    return (
        <AppLayout onPrint={handlePrint} topbar={
            <Topbar onLoad={handleLoad} isLoading={isLoading} onPrint={handlePrint} />
        }>
            <main className="flex-1 overflow-y-auto p-4">
                {enabled && !isLoading && <SmartAlerts mis={mis} kpi={kpi} />}
                <AnimatePresence mode="wait">
                    {!enabled ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[60vh]">
                            <EmptyState
                                icon={Activity}
                                title="Select a branch and date"
                                description="Choose your branch and date above, then click Load Report to view the MIS dashboard."
                                action={
                                    <button onClick={() => handleLoad()}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-violet-600 text-white text-[14px] font-700 rounded-lg shadow-md hover:opacity-90 transition-all cursor-pointer border-0">
                                        Load Report
                                    </button>
                                }
                            />
                        </motion.div>
                    ) : isError ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[60vh]">
                            <EmptyState
                                title="Failed to load report"
                                description="No data found for the selected branch and date. Try uploading data first."
                                action={
                                    <button onClick={() => handleLoad()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-[13px] font-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer border border-slate-200">
                                        Retry
                                    </button>
                                }
                            />
                        </motion.div>
                    ) : (
                        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            {tabContent()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </AppLayout>
    );
}
