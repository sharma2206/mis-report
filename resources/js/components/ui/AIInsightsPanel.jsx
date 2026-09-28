/**
 * AIInsightsPanel — Rule-based executive insights panel.
 * Generates actionable business insights by comparing current vs previous period
 * analytics data. Zero external dependencies — pure arithmetic.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    ChevronDown, ChevronUp, Lightbulb, BarChart2, BedDouble, Scissors,
    Users, DollarSign, HeartPulse, Zap, Target, Info,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmtL } from '../../utils/formatters';

// ── Insight types ─────────────────────────────────────────────────────────────
const INSIGHT_TYPE = {
    positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', sub: 'text-emerald-600', icon: TrendingUp,    iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
    negative: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     sub: 'text-red-600',     icon: TrendingDown,  iconColor: 'text-red-500',     dot: 'bg-red-400'     },
    warning:  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   sub: 'text-amber-600',   icon: AlertTriangle, iconColor: 'text-amber-500',   dot: 'bg-amber-400'   },
    info:     { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    sub: 'text-blue-600',    icon: Info,          iconColor: 'text-blue-500',    dot: 'bg-blue-400'    },
    success:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  sub: 'text-violet-600',  icon: CheckCircle2,  iconColor: 'text-violet-500',  dot: 'bg-violet-400'  },
};

const CATEGORY_ICON = {
    revenue:    DollarSign,
    patients:   Users,
    beds:       BedDouble,
    surgery:    Scissors,
    er:         HeartPulse,
    collection: BarChart2,
    target:     Target,
    general:    Lightbulb,
};

// ── Insight generator — pure function ────────────────────────────────────────
function generateInsights(kpi, mis, branch) {
    const insights = [];
    if (!kpi && !mis) return insights;

    const ftdRev = mis?.sales?.ftd || {};
    const mtdRev = mis?.sales?.mtd || {};
    const ftdVol = mis?.volume?.ftd || {};
    const mtdVol = mis?.volume?.mtd || {};

    const totalFtd = (Number(ftdRev.op) || 0) + (Number(ftdRev.ip) || 0) +
                     (Number(ftdRev.er) || 0) + (Number(ftdRev.ph) || 0);

    const totalMtd = (Number(mtdRev.op) || 0) + (Number(mtdRev.ip) || 0) +
                     (Number(mtdRev.er) || 0) + (Number(mtdRev.ph) || 0);

    // ── Revenue insights ──────────────────────────────────────────────────────
    if (kpi?.yesterday_revenue && totalFtd > 0) {
        const growth = ((totalFtd - kpi.yesterday_revenue) / Math.abs(kpi.yesterday_revenue)) * 100;
        if (growth > 20) {
            insights.push({ type: 'positive', category: 'revenue', icon: TrendingUp,
                title: `Revenue surge: +${growth.toFixed(1)}% vs yesterday`,
                message: `Today's revenue of ${fmtL(totalFtd)} significantly outperforms yesterday's ${fmtL(kpi.yesterday_revenue)}.`,
            });
        } else if (growth < -20) {
            insights.push({ type: 'negative', category: 'revenue', icon: TrendingDown,
                title: `Revenue decline: ${growth.toFixed(1)}% vs yesterday`,
                message: `Today's revenue of ${fmtL(totalFtd)} is significantly below yesterday's ${fmtL(kpi.yesterday_revenue)}. Investigate patient volume.`,
            });
        } else if (growth > 0) {
            insights.push({ type: 'info', category: 'revenue', icon: TrendingUp,
                title: `Revenue up ${growth.toFixed(1)}% vs yesterday`,
                message: `${fmtL(totalFtd)} today vs ${fmtL(kpi.yesterday_revenue)} yesterday.`,
            });
        }
    }

    // Target achievement
    if (kpi?.target_revenue && totalFtd > 0) {
        const ach = (totalFtd / kpi.target_revenue) * 100;
        if (ach >= 100) {
            insights.push({ type: 'success', category: 'target', icon: Target,
                title: `Target achieved: ${ach.toFixed(0)}% of daily goal`,
                message: `Revenue target of ${fmtL(kpi.target_revenue)} has been met. Outstanding performance!`,
            });
        } else if (ach < 60) {
            insights.push({ type: 'warning', category: 'target', icon: Target,
                title: `Only ${ach.toFixed(0)}% of daily target reached`,
                message: `${fmtL(kpi.target_revenue - totalFtd)} more needed to hit today's target of ${fmtL(kpi.target_revenue)}.`,
            });
        }
    }

    // ── OP insights ───────────────────────────────────────────────────────────
    const opFtd = kpi?.op_count ?? ftdVol.total_op;
    const opYest = kpi?.yesterday_op_count;
    if (opFtd != null && opYest) {
        const g = ((opFtd - opYest) / opYest) * 100;
        if (Math.abs(g) > 15) {
            insights.push({ type: g > 0 ? 'positive' : 'warning', category: 'patients', icon: Users,
                title: `OP visits ${g > 0 ? 'up' : 'down'} ${Math.abs(g).toFixed(0)}% — ${opFtd.toLocaleString('en-IN')} today`,
                message: g > 0
                    ? `Outpatient volume is healthy. Consider capacity planning.`
                    : `Lower footfall vs yesterday (${opYest}). Check appointment bookings.`,
            });
        }
    }

    // ── Bed occupancy insights ────────────────────────────────────────────────
    const occPct = kpi?.bed_occupancy_pct ?? ftdVol.occupancy_pct;
    if (occPct != null) {
        if (occPct >= 95) {
            insights.push({ type: 'warning', category: 'beds', icon: BedDouble,
                title: `Critical bed occupancy: ${occPct.toFixed(0)}%`,
                message: `Near-full capacity. Expedite pending discharges and review ward allocations immediately.`,
            });
        } else if (occPct >= 85) {
            insights.push({ type: 'info', category: 'beds', icon: BedDouble,
                title: `High bed occupancy: ${occPct.toFixed(0)}%`,
                message: `Approaching capacity. Monitor admissions vs discharge pipeline.`,
            });
        } else if (occPct < 40) {
            insights.push({ type: 'warning', category: 'beds', icon: BedDouble,
                title: `Low bed utilization: ${occPct.toFixed(0)}%`,
                message: `More than 60% beds available. Review admission strategy and referral channels.`,
            });
        }
    }

    // ── Discount insights ─────────────────────────────────────────────────────
    if (kpi?.discount_amount && totalFtd > 0) {
        const discPct = (kpi.discount_amount / totalFtd) * 100;
        if (discPct > 20) {
            insights.push({ type: 'warning', category: 'revenue', icon: TrendingDown,
                title: `High discount rate: ${discPct.toFixed(1)}% of revenue`,
                message: `Discounts of ${fmtL(kpi.discount_amount)} are eroding margins. Review approval authority.`,
            });
        }
    }

    // ── Surgery insights ──────────────────────────────────────────────────────
    const surgFtd  = kpi?.surgery_count ?? ftdVol.surgery_count;
    const surgYest = kpi?.yesterday_surgery;
    if (surgFtd != null && surgYest != null) {
        if (surgFtd > surgYest * 1.5) {
            insights.push({ type: 'positive', category: 'surgery', icon: Scissors,
                title: `High surgical volume: ${surgFtd} cases today`,
                message: `50%+ more surgeries than yesterday (${surgYest}). OT teams are performing well.`,
            });
        }
    }

    // ── Collection insights ───────────────────────────────────────────────────
    if (kpi?.net_collection && totalFtd > 0) {
        const collRate = (kpi.net_collection / totalFtd) * 100;
        if (collRate < 70) {
            insights.push({ type: 'warning', category: 'collection', icon: BarChart2,
                title: `Collection rate: ${collRate.toFixed(0)}% of revenue`,
                message: `${fmtL(totalFtd - kpi.net_collection)} outstanding. Follow up with billing team on pending payments.`,
            });
        } else if (collRate >= 95) {
            insights.push({ type: 'positive', category: 'collection', icon: BarChart2,
                title: `Excellent collection efficiency: ${collRate.toFixed(0)}%`,
                message: `Billing and collection teams are at peak performance today.`,
            });
        }
    }

    // ── MTD trend insight ─────────────────────────────────────────────────────
    if (totalMtd > 0 && totalFtd > 0) {
        const daysInMonth = new Date().getDate();
        const avgDaily = totalMtd / daysInMonth;
        if (totalFtd > avgDaily * 1.3) {
            insights.push({ type: 'positive', category: 'revenue', icon: TrendingUp,
                title: `Today is ${((totalFtd / avgDaily - 1) * 100).toFixed(0)}% above MTD daily average`,
                message: `Daily avg: ${fmtL(avgDaily)} | Today: ${fmtL(totalFtd)}. Strong finish to the month.`,
            });
        }
    }

    // Fallback if nothing to show
    if (insights.length === 0) {
        insights.push({ type: 'info', category: 'general', icon: Lightbulb,
            title: 'All metrics within normal range',
            message: 'No significant deviations detected. Operations are running smoothly.',
        });
    }

    return insights;
}

// ── Insight Card ──────────────────────────────────────────────────────────────
const InsightCard = ({ insight, index }) => {
    const cfg       = INSIGHT_TYPE[insight.type] || INSIGHT_TYPE.info;
    const CardIcon  = insight.icon || cfg.icon;
    const CatIcon   = CATEGORY_ICON[insight.category] || Lightbulb;

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border flex-1 min-w-[240px]',
                cfg.bg, cfg.border,
            )}
        >
            <div className="flex-shrink-0 mt-0.5">
                <CardIcon className={cn('w-4 h-4', cfg.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <CatIcon className="w-3 h-3 text-slate-400" />
                    <p className={cn('text-[11px] font-700 leading-tight', cfg.text)}>{insight.title}</p>
                </div>
                <p className={cn('text-[10px] leading-snug mt-0.5', cfg.sub)}>{insight.message}</p>
            </div>
        </motion.div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const AIInsightsPanel = ({ kpi, mis, branch, isLoading }) => {
    const [collapsed, setCollapsed] = useState(false);

    const insights = useMemo(() => generateInsights(kpi, mis, branch), [kpi, mis, branch]);

    const positiveCount = insights.filter(i => i.type === 'positive' || i.type === 'success').length;
    const warningCount  = insights.filter(i => i.type === 'warning' || i.type === 'negative').length;

    if (isLoading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                    <div className="w-4 h-4 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 bg-slate-100 rounded w-28 animate-pulse" />
                </div>
                <div className="px-3 py-2.5 flex flex-wrap gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex-1 min-w-[240px] h-16 bg-slate-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
            {/* Header */}
            <button
                onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer bg-transparent border-0 text-left"
                style={{ borderBottom: collapsed ? 'none' : '1px solid #f1f5f9' }}
            >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[12px] font-700 text-slate-700 flex-1">
                    AI Executive Insights
                </span>
                <div className="flex items-center gap-1.5">
                    {warningCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-700">
                            {warningCount} alert{warningCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {positiveCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-700">
                            {positiveCount} highlight{positiveCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <Zap className="w-3 h-3 text-violet-400" />
                    {collapsed
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronUp   className="w-3.5 h-3.5 text-slate-400" />
                    }
                </div>
            </button>

            {/* Insights */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 py-2.5 flex flex-wrap gap-2">
                            {insights.map((insight, i) => (
                                <InsightCard key={i} insight={insight} index={i} />
                            ))}
                        </div>
                        <div className="px-4 pb-2 flex items-center gap-1.5">
                            <Lightbulb className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] text-slate-400">
                                Insights auto-generated from live data • Comparing today vs. yesterday
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
