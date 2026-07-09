import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Minus,
    CreditCard, BedDouble, Users, Stethoscope,
    Package, ShoppingBag, Activity, HeartPulse,
    Wallet, Scissors, Star,
} from 'lucide-react';
import { fmtL, fmtPct } from '../../utils/formatters';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtCount = (v) => v === null ? 'N/A' : (v ?? 0).toLocaleString('en-IN');

const TrendArrow = ({ current, previous }) => {
    if (current === null || !previous || previous === 0)
        return <Minus className="w-3 h-3 text-slate-300" />;
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    if (Math.abs(pct) < 0.5) return <Minus className="w-3 h-3 text-slate-300" />;
    if (pct > 0)  return <TrendingUp   className="w-3 h-3 text-emerald-500" />;
    return             <TrendingDown  className="w-3 h-3 text-red-400" />;
};

// ── color maps ────────────────────────────────────────────────────────────────
const GRADIENT = {
    blue:   'from-blue-600 to-blue-800',
    green:  'from-emerald-500 to-emerald-700',
    violet: 'from-violet-600 to-violet-800',
    amber:  'from-amber-500 to-amber-700',
    red:    'from-red-500 to-red-700',
    cyan:   'from-cyan-500 to-cyan-700',
    rose:   'from-rose-500 to-rose-700',
    indigo: 'from-indigo-500 to-indigo-700',
    teal:   'from-teal-500 to-teal-700',
    sky:    'from-sky-500 to-sky-700',
};

const TEXT = {
    blue:   'text-blue-700',
    green:  'text-emerald-700',
    violet: 'text-violet-700',
    amber:  'text-amber-700',
    red:    'text-red-700',
    cyan:   'text-cyan-700',
    rose:   'text-rose-700',
    indigo: 'text-indigo-700',
    teal:   'text-teal-700',
    sky:    'text-sky-700',
};

const NA_CLS = 'text-slate-400 text-[11px] font-500 italic';

// ── Single KPI Card ───────────────────────────────────────────────────────────
const KPICard = ({ label, ftd, mtd, icon: Icon, color = 'blue', format = 'rupee', index = 0, suffix = '' }) => {
    const isNA = ftd === null || ftd === undefined;

    const fmtVal = (v) => {
        if (v === null || v === undefined) return null;
        if (format === 'rupee') return fmtL(v);
        if (format === 'pct')   return fmtPct(v);
        if (format === 'count') return fmtCount(v);
        return String(v ?? 0);
    };

    const displayFtd = fmtVal(ftd);
    const displayMtd = fmtVal(mtd);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className={`relative bg-white border border-slate-200 rounded-xl
                        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default
                        overflow-hidden`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
            {/* Top gradient accent */}
            <div className={`h-[3px] w-full bg-gradient-to-r ${GRADIENT[color] || GRADIENT.blue}`} />

            <div className="p-3">
                {/* Icon + trend */}
                <div className="flex items-start justify-between mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${GRADIENT[color] || GRADIENT.blue}
                                    flex items-center justify-center shadow-sm`}>
                        {Icon && <Icon className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <TrendArrow current={isNA ? null : ftd} previous={mtd} />
                </div>

                {/* Label */}
                <p className="text-[10px] font-700 text-slate-500 uppercase tracking-wide leading-tight mb-1.5">
                    {label}
                </p>

                {/* FTD value */}
                {isNA ? (
                    <p className={NA_CLS}>N/A</p>
                ) : (
                    <p className={`text-[1.05rem] font-800 leading-none tabular-nums mb-1 ${TEXT[color] || TEXT.blue}`}>
                        {displayFtd}{suffix}
                    </p>
                )}

                {/* MTD row */}
                {mtd !== undefined && !isNA && (
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-700 uppercase text-slate-400">MTD</span>
                        <span className="text-[10px] font-600 text-slate-500 tabular-nums">
                            {mtd === null || mtd === undefined ? 'N/A' : `${displayMtd}${suffix}`}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ── KPI Strip ─────────────────────────────────────────────────────────────────
export const KPIStrip = ({ mis, kpi, collection, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-[108px] rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    const ftdRev = mis?.sales?.ftd || {};
    const mtdRev = mis?.sales?.mtd || {};
    const ftdVol = mis?.volume?.ftd  || {};
    const mtdVol = mis?.volume?.mtd  || {};

    const totalFtd = (Number(ftdRev.op) || 0) + (Number(ftdRev.ip) || 0) +
                     (Number(ftdRev.er) || 0) + (Number(ftdRev.ph) || 0);
    const totalMtd = (Number(mtdRev.op) || 0) + (Number(mtdRev.ip) || 0) +
                     (Number(mtdRev.er) || 0) + (Number(mtdRev.ph) || 0);

    // kpi keys from AnalyticsController.kpi():
    //   total_revenue, total_patients, op_count, ip_count, er_count,
    //   discount_amount, net_collection, package_consumption, pharmacy_sales,
    //   bed_occupancy_pct, bed_occupancy, bed_count, avg_revenue_per_patient,
    //   surgery_count, major_surgeries

    const cards = [
        { label: 'Total Revenue',   ftd: totalFtd,                    mtd: totalMtd,            icon: TrendingUp,  color: 'blue',   format: 'rupee' },
        { label: 'OP Revenue',      ftd: ftdRev.op,                   mtd: mtdRev.op,           icon: CreditCard,  color: 'green',  format: 'rupee' },
        { label: 'IP Revenue',      ftd: ftdRev.ip,                   mtd: mtdRev.ip,           icon: BedDouble,   color: 'violet', format: 'rupee' },
        { label: 'ER Revenue',      ftd: ftdRev.er,                   mtd: mtdRev.er,           icon: HeartPulse,  color: 'red',    format: 'rupee' },
        { label: 'Pharmacy Rev',    ftd: ftdRev.ph,                   mtd: mtdRev.ph,           icon: ShoppingBag, color: 'amber',  format: 'rupee' },
        { label: 'Net Collection',  ftd: kpi?.net_collection,         mtd: null,                icon: Wallet,      color: 'cyan',   format: 'rupee' },
        { label: 'Package',         ftd: kpi?.package_consumption,    mtd: null,                icon: Package,     color: 'indigo', format: 'rupee' },
        { label: 'OP Visits',       ftd: kpi?.op_count   ?? ftdVol.total_op, mtd: mtdVol.total_op, icon: Users,   color: 'green',  format: 'count' },
        { label: 'IP Patients',     ftd: kpi?.ip_count   ?? ftdVol.admission, mtd: null,        icon: BedDouble,   color: 'violet', format: 'count' },
        { label: 'ER Patients',     ftd: kpi?.er_count   ?? ftdVol.er_count,  mtd: null,        icon: HeartPulse,  color: 'red',    format: 'count' },
        { label: 'Admissions',      ftd: ftdVol.admission,            mtd: mtdVol.admission,    icon: Activity,    color: 'sky',    format: 'count' },
        { label: 'Discharges',      ftd: ftdVol.discharge,            mtd: mtdVol.discharge,    icon: Star,        color: 'teal',   format: 'count' },
        { label: 'Surgeries',       ftd: kpi?.surgery_count,          mtd: null,                icon: Scissors,    color: 'rose',   format: 'count' },
        { label: 'Bed Occupancy',   ftd: ftdVol.occupancy_pct,        mtd: mtdVol.occupancy_pct,icon: Stethoscope, color: 'amber',  format: 'pct'   },
    ];

    // Only show cards that have data (non-null, non-undefined FTD value)
    const visibleCards = cards.filter(c => c.ftd !== null && c.ftd !== undefined);

    return (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
            {visibleCards.map((card, i) => (
                <KPICard key={card.label} {...card} index={i} />
            ))}
        </div>
    );
};
