/**
 * KPIStrip — Executive-grade KPI cards with:
 *   • Current value (FTD)  • Yesterday value
 *   • MTD value            • Target + Achievement %
 *   • Growth % with arrow  • 7-day mini sparkline
 */
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Minus,
    CreditCard, BedDouble, Users, Stethoscope,
    Package, ShoppingBag, Activity, HeartPulse,
    Wallet, Scissors, Star, Target,
} from 'lucide-react';
import { fmtL, fmtPct } from '../../utils/formatters';
import { cn } from '../../utils/cn';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtCount = (v) => v === null ? 'N/A' : (v ?? 0).toLocaleString('en-IN');

const calcGrowth = (current, previous) => {
    if (current == null || !previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
};

const calcAchievement = (current, target) => {
    if (current == null || !target || target === 0) return null;
    return Math.min((current / target) * 100, 999);
};

// ── Inline sparkline using canvas ────────────────────────────────────────────
const Sparkline = ({ data = [], color = '#1d4ed8', height = 28 }) => {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !data.length) return;
        const ctx    = canvas.getContext('2d');
        const dpr    = window.devicePixelRatio || 1;
        const w      = canvas.offsetWidth;
        const h      = height;
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const vals  = data.map(Number);
        const min   = Math.min(...vals);
        const max   = Math.max(...vals);
        const range = max - min || 1;
        const step  = w / (vals.length - 1);

        ctx.clearRect(0, 0, w, h);

        // Gradient fill
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '40');
        grad.addColorStop(1, color + '00');

        ctx.beginPath();
        vals.forEach((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        const lastX = (vals.length - 1) * step;
        const lastY = h - ((vals[vals.length - 1] - min) / range) * (h - 4) - 2;
        ctx.lineTo(lastX, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        vals.forEach((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.lineJoin    = 'round';
        ctx.stroke();

        // Last dot
        const dotX = lastX;
        const dotY = lastY;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }, [data, color, height]);

    return <canvas ref={ref} style={{ width: '100%', height }} />;
};

// ── Growth badge ──────────────────────────────────────────────────────────────
const GrowthBadge = ({ pct }) => {
    if (pct === null) return null;
    const abs = Math.abs(pct);
    if (abs < 0.5) return <span className="text-[10px] font-600 text-slate-400">—</span>;
    const up = pct > 0;
    return (
        <span className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-700 px-1.5 py-0.5 rounded-full',
            up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
        )}>
            {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {abs.toFixed(1)}%
        </span>
    );
};

// ── Achievement progress bar ──────────────────────────────────────────────────
const AchievementBar = ({ pct }) => {
    if (pct === null) return null;
    const capped   = Math.min(pct, 100);
    const color    = pct >= 100 ? '#059669' : pct >= 80 ? '#1d4ed8' : pct >= 60 ? '#d97706' : '#dc2626';
    return (
        <div className="mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-700 text-slate-400 uppercase tracking-wider">Target</span>
                <span className="text-[10px] font-700" style={{ color }}>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${capped}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                />
            </div>
        </div>
    );
};

// ── color maps ────────────────────────────────────────────────────────────────
const GRADIENT = {
    blue:   ['#1d4ed8', '#2563eb'],
    green:  ['#059669', '#10b981'],
    violet: ['#7c3aed', '#8b5cf6'],
    amber:  ['#b45309', '#d97706'],
    red:    ['#dc2626', '#ef4444'],
    cyan:   ['#0891b2', '#06b6d4'],
    rose:   ['#e11d48', '#f43f5e'],
    indigo: ['#4338ca', '#6366f1'],
    teal:   ['#0f766e', '#14b8a6'],
    sky:    ['#0284c7', '#38bdf8'],
    orange: ['#c2410c', '#f97316'],
    pink:   ['#be185d', '#ec4899'],
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
    orange: 'text-orange-700',
    pink:   'text-pink-700',
};

const NA_CLS = 'text-slate-400 text-[11px] font-500 italic';

// ── Animated counter ──────────────────────────────────────────────────────────
const AnimatedValue = ({ value, className }) => {
    return (
        <motion.span
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={className}
        >
            {value}
        </motion.span>
    );
};

// ── Single KPI Card ───────────────────────────────────────────────────────────
const KPICard = ({
    label, ftd, mtd, yesterday, target, sparkline,
    icon: Icon, color = 'blue', format = 'rupee', index = 0, suffix = '', branchName,
}) => {
    const isNA  = ftd === null || ftd === undefined;
    const grad  = GRADIENT[color] || GRADIENT.blue;
    const tcls  = TEXT[color] || TEXT.blue;

    const fmtVal = (v) => {
        if (v === null || v === undefined) return null;
        if (format === 'rupee') return fmtL(v);
        if (format === 'pct')   return fmtPct(v);
        if (format === 'count') return fmtCount(v);
        return String(v ?? 0);
    };

    const displayFtd       = fmtVal(ftd);
    const displayMtd       = fmtVal(mtd);
    const displayYesterday = fmtVal(yesterday);
    const growthPct        = calcGrowth(ftd, yesterday);
    const achievementPct   = calcAchievement(ftd, target);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025, duration: 0.2 }}
            className="relative bg-white border border-slate-200 rounded-xl overflow-hidden
                       hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default group"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
            {/* Gradient accent top bar */}
            <div
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${grad[0]}, ${grad[1]})` }}
            />

            <div className="p-3">
                {/* Icon + growth badge */}
                <div className="flex items-start justify-between mb-2">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                    >
                        {Icon && <Icon className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <GrowthBadge pct={growthPct} />
                </div>

                {/* Label & Branch Name */}
                <div className="mb-1.5">
                    <p className="text-[10px] font-700 text-slate-500 uppercase tracking-wide leading-tight">
                        {label}
                    </p>
                    {branchName && (
                        <p className="text-[10px] font-600 text-slate-400 mt-0.5 truncate">
                            {branchName}
                        </p>
                    )}
                </div>

                {/* FTD value */}
                {isNA ? (
                    <p className={NA_CLS}>N/A</p>
                ) : (
                    <AnimatedValue
                        value={`${displayFtd}${suffix}`}
                        className={`text-[1.05rem] font-800 leading-none tabular-nums ${tcls}`}
                    />
                )}

                {/* Yesterday + MTD row */}
                {!isNA && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {yesterday !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-700 uppercase text-slate-400">Yest</span>
                                <span className="text-[10px] font-600 text-slate-500 tabular-nums">
                                    {displayYesterday ?? '—'}
                                </span>
                            </div>
                        )}
                        {mtd !== undefined && mtd !== null && (
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-700 uppercase text-slate-400">MTD</span>
                                <span className="text-[10px] font-600 text-slate-500 tabular-nums">
                                    {displayMtd}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Achievement bar */}
                {!isNA && achievementPct !== null && (
                    <AchievementBar pct={achievementPct} />
                )}
            </div>

            {/* Sparkline — shown on hover or always if data present */}
            {sparkline && sparkline.length > 1 && (
                <div className="px-3 pb-2 -mt-1">
                    <Sparkline data={sparkline} color={grad[0]} height={24} />
                </div>
            )}
        </motion.div>
    );
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
const KPISkeleton = () => (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="h-[3px] bg-slate-200" />
        <div className="p-3 space-y-2 animate-pulse">
            <div className="flex justify-between">
                <div className="w-7 h-7 rounded-lg bg-slate-100" />
                <div className="w-10 h-4 rounded-full bg-slate-100" />
            </div>
            <div className="h-2.5 bg-slate-100 rounded w-3/4" />
            <div className="h-5 bg-slate-100 rounded w-1/2" />
            <div className="h-2 bg-slate-100 rounded w-full" />
            <div className="h-6 bg-slate-100 rounded w-full mt-1" />
        </div>
    </div>
);

import { useSelector } from 'react-redux';
import { selectBranch } from '../../store/reportSlice';
import { useBranches } from '../../hooks/useBranches';

export const KPIStrip = ({ mis, kpi, collection, isLoading }) => {
    const selectedBranches = useSelector(selectBranch);
    const { branches } = useBranches();
    
    // Determine the branch name to display
    let branchName = 'All Branches';
    if (selectedBranches.length === 1 && selectedBranches[0] !== 'all') {
        const b = branches.find(x => x.key === selectedBranches[0]);
        branchName = b ? b.name : selectedBranches[0];
    } else if (selectedBranches.length > 1 && selectedBranches.length < branches.length) {
        if (selectedBranches.length === 2) {
            const b1 = branches.find(x => x.key === selectedBranches[0])?.name || selectedBranches[0];
            const b2 = branches.find(x => x.key === selectedBranches[1])?.name || selectedBranches[1];
            branchName = `${b1} + ${b2}`;
        } else {
            branchName = `${selectedBranches.length} Branches Selected`;
        }
    }
    if (isLoading) {
        return (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
                {Array.from({ length: 12 }).map((_, i) => <KPISkeleton key={i} />)}
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

    // kpi keys from AnalyticsController.kpi()
    const cards = [
        {
            label: 'Total Revenue',  ftd: totalFtd, mtd: totalMtd,
            yesterday: kpi?.yesterday_revenue ?? null,
            target:    kpi?.target_revenue    ?? null,
            sparkline: kpi?.revenue_trend     ?? [],
            icon: TrendingUp,  color: 'blue',   format: 'rupee', branchName,
        },
        {
            label: 'OP Revenue', ftd: ftdRev.op, mtd: mtdRev.op,
            yesterday: kpi?.yesterday_op_revenue ?? null,
            icon: CreditCard, color: 'green', format: 'rupee', branchName,
        },
        {
            label: 'IP Revenue', ftd: ftdRev.ip, mtd: mtdRev.ip,
            yesterday: kpi?.yesterday_ip_revenue ?? null,
            icon: BedDouble, color: 'violet', format: 'rupee', branchName,
        },
        {
            label: 'ER Revenue', ftd: ftdRev.er, mtd: mtdRev.er,
            yesterday: kpi?.yesterday_er_revenue ?? null,
            icon: HeartPulse, color: 'red', format: 'rupee', branchName,
        },
        {
            label: 'Pharmacy Rev', ftd: ftdRev.ph, mtd: mtdRev.ph,
            yesterday: kpi?.yesterday_pharmacy ?? null,
            icon: ShoppingBag, color: 'amber', format: 'rupee', branchName,
        },
        {
            label: 'Net Collection', ftd: kpi?.net_collection, mtd: mis?.totals?.collection_mtd ?? null,
            yesterday: kpi?.yesterday_collection ?? null,
            target:    kpi?.target_collection    ?? null,
            sparkline: kpi?.collection_trend     ?? [],
            icon: Wallet, color: 'cyan', format: 'rupee', branchName,
        },
        {
            label: 'Package', ftd: kpi?.package_consumption, mtd: null,
            icon: Package, color: 'indigo', format: 'rupee', branchName,
        },
        {
            label: 'OP Visits', ftd: kpi?.op_count ?? ftdVol.total_op, mtd: mtdVol.total_op,
            yesterday: kpi?.yesterday_op_count ?? null,
            target:    kpi?.target_op          ?? null,
            sparkline: kpi?.op_trend           ?? [],
            icon: Users, color: 'green', format: 'count', branchName,
        },
        {
            label: 'IP Census', ftd: kpi?.bed_occupancy ?? ftdVol.occupancy, mtd: mtdVol.occupancy ?? null,
            icon: BedDouble, color: 'violet', format: 'count', branchName,
        },
        {
            label: 'ER Patients', ftd: kpi?.er_count ?? ftdVol.er_count, mtd: mtdVol.er_count ?? null,
            yesterday: kpi?.yesterday_er_count ?? null,
            icon: HeartPulse, color: 'red', format: 'count', branchName,
        },
        {
            label: 'Admissions', ftd: kpi?.ip_count ?? ftdVol.admission, mtd: mtdVol.admission,
            yesterday: kpi?.yesterday_admissions ?? null,
            icon: Activity, color: 'sky', format: 'count', branchName,
        },
        {
            label: 'Discharges', ftd: ftdVol.discharge, mtd: mtdVol.discharge,
            icon: Star, color: 'teal', format: 'count', branchName,
        },
        {
            label: 'Surgeries', ftd: kpi?.surgery_count ?? ftdVol.surgery_count, mtd: mtdVol.surgery_count ?? null,
            yesterday: kpi?.yesterday_surgery ?? null,
            icon: Scissors, color: 'rose', format: 'count', branchName,
        },
        {
            label: 'Bed Occupancy', ftd: kpi?.bed_occupancy_pct ?? ftdVol.occupancy_pct, mtd: mtdVol.occupancy_pct,
            target: kpi?.target_occupancy ?? null,
            icon: Stethoscope, color: 'amber', format: 'pct', branchName,
        },
        {
            label: 'Avg Bill', ftd: kpi?.avg_revenue_per_patient, mtd: null,
            icon: CreditCard, color: 'orange', format: 'rupee', branchName,
        },
        {
            label: 'Discount', ftd: kpi?.discount_amount, mtd: null,
            icon: Target, color: 'pink', format: 'rupee', branchName,
        },
    ];

    const visibleCards = cards.filter(c => c.ftd !== null && c.ftd !== undefined);

    return (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
            {visibleCards.map((card, i) => (
                <KPICard key={card.label} {...card} index={i} />
            ))}
        </div>
    );
};
