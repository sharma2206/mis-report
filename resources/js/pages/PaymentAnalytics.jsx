/**
 * PaymentAnalytics — Cash/UPI/Card/Insurance/Corporate split, trends, multi-mode analysis.
 */
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import EChart from "../components/ui/EChart";
import {
    CreditCard,
    Wallet,
    TrendingUp,
    BarChart3,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Section } from "../components/ui/Section";
import { GlobalFilterBar } from "../components/ui/GlobalFilterBar";
import { selectToken } from "../store/authSlice";
import {
    selectBranch,
    selectGlobalFrom,
    selectGlobalTo,
} from "../store/reportSlice";
import { analyticsApi } from "../services/api";
import { ChartSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { fmtL } from "../utils/formatters";
import { cn } from "../utils/cn";

const PAL = [
    "#1d4ed8",
    "#7c3aed",
    "#059669",
    "#d97706",
    "#dc2626",
    "#0891b2",
    "#9333ea",
    "#ea580c",
];
const TOOLTIP = {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    textStyle: { fontSize: 11 },
    extraCssText: "border-radius:10px",
};

const fmtRupee = (v) =>
    v == null
        ? "—"
        : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtPctN = (v, total) =>
    total ? `${((v / total) * 100).toFixed(1)}%` : "0%";

const ModeCard = ({ mode, amount, pct, color, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
    >
        <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-700 text-slate-600 truncate">
                {mode}
            </p>
            <span className="text-[10px] font-700 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {pct}
            </span>
        </div>
        <p className="text-[1.05rem] font-800 text-slate-800 tabular-nums">
            {fmtRupee(amount)}
        </p>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: pct }}
                transition={{
                    duration: 0.7,
                    ease: "easeOut",
                    delay: index * 0.04,
                }}
                className="h-full rounded-full"
                style={{ background: color }}
            />
        </div>
    </motion.div>
);

export default function PaymentAnalytics() {
    const token = useSelector(selectToken);
    const branch = useSelector(selectBranch);
    const from = useSelector(selectGlobalFrom);
    const to = useSelector(selectGlobalTo);

    if (!token) return <Navigate to="/login" replace />;

    const params = { branch, from, to };

    const { data: colRaw, isLoading } = useQuery({
        queryKey: ["pay-collection", branch, from, to],
        queryFn: () => analyticsApi.collection(params).then((r) => r.data),
        enabled: !!(branch && from && to),
    });

    const { data: trendRaw, isLoading: loadTrend } = useQuery({
        queryKey: ["pay-trend", branch, from, to],
        queryFn: () =>
            analyticsApi.dailyTrend({ branch, from, to }).then((r) => r.data),
        enabled: !!(branch && from && to),
    });

    const col = colRaw?.success ? colRaw.data : null;
    const trend = trendRaw?.success ? trendRaw.data : [];

    const byMode = col?.payment_modes ?? col?.by_payment_mode ?? [];
    const byType = col?.by_patient_type ?? [];
    const byTxn = col?.by_category ?? [];
    const daily = col?.daily_trend ?? [];
    const total = col?.total_collection ?? 0;

    // Summary cards
    const summaryCards = [
        { label: "Total Collection", val: total, icon: Wallet, color: "blue" },
        {
            label: "Cash Collection",
            val: byMode.find((m) => m.mode === "Cash")?.amount,
            icon: DollarSign,
            color: "green",
        },
        {
            label: "Digital Payments",
            val: byMode.find((m) => /UPI|Online|Digital/i.test(m.mode))?.amount,
            icon: CreditCard,
            color: "violet",
        },
        {
            label: "Insurance / TPA",
            val: byMode.find((m) => /TPA|Insurance/i.test(m.mode))?.amount,
            icon: TrendingUp,
            color: "amber",
        },
    ];

    return (
        <AppLayout
            topbar={
                <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CreditCard className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-700 text-slate-800">
                            Payment Analytics
                        </h1>
                        <p className="text-[11px] text-slate-400">
                            {from} – {to}
                        </p>
                    </div>
                </div>
            }
        >
            {/* <GlobalFilterBar /> */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {summaryCards.map(
                        ({ label, val, icon: Icon, color }, i) => {
                            const colors = {
                                blue: "text-blue-700 bg-blue-50 border-blue-100",
                                green: "text-emerald-700 bg-emerald-50 border-emerald-100",
                                violet: "text-violet-700 bg-violet-50 border-violet-100",
                                amber: "text-amber-700 bg-amber-50 border-amber-100",
                            };
                            const cls = colors[color];
                            return (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                                                cls,
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400">
                                                {label}
                                            </p>
                                            <p
                                                className={cn(
                                                    "text-[1.1rem] font-800 tabular-nums mt-0.5",
                                                    cls.split(" ")[0],
                                                )}
                                            >
                                                {fmtRupee(val)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        },
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Payment mode donut */}
                    <Section title="Payment Mode Split" icon={CreditCard}>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : !byMode.length ? (
                            <EmptyState
                                title="No collection data"
                                description="Upload cashier collection CSV."
                            />
                        ) : (
                            <>
                                <EChart
                                    height={200}
                                    option={{
                                        tooltip: {
                                            trigger: "item",
                                            formatter: (p) =>
                                                `${p.name}: ${fmtRupee(p.value)} (${p.percent}%)`,
                                            ...TOOLTIP,
                                        },
                                        series: [
                                            {
                                                type: "pie",
                                                radius: ["42%", "70%"],
                                                data: byMode.map((m, i) => ({
                                                    name: m.mode,
                                                    value: m.amount,
                                                    itemStyle: {
                                                        color: PAL[
                                                            i % PAL.length
                                                        ],
                                                    },
                                                })),
                                                label: { show: false },
                                                itemStyle: {
                                                    borderWidth: 2,
                                                    borderColor: "#fff",
                                                },
                                            },
                                        ],
                                    }}
                                />
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {byMode.map((m, i) => (
                                        <ModeCard
                                            key={m.mode}
                                            mode={m.mode}
                                            amount={m.amount}
                                            pct={fmtPctN(m.amount, total)}
                                            color={PAL[i % PAL.length]}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </Section>

                    {/* Patient type collection */}
                    <Section
                        title="Collection by Patient Type"
                        icon={BarChart3}
                    >
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : !byType.length ? (
                            <EmptyState
                                title="No patient type data"
                                description="Upload cashier collection CSV."
                            />
                        ) : (
                            <EChart
                                height={220}
                                option={{
                                    grid: {
                                        top: 16,
                                        right: 16,
                                        bottom: 32,
                                        left: 8,
                                        containLabel: true,
                                    },
                                    tooltip: { trigger: "axis", ...TOOLTIP },
                                    xAxis: {
                                        type: "category",
                                        data: byType.map((r) => r.patient_type),
                                        axisLabel: {
                                            fontSize: 10,
                                            color: "#64748b",
                                            fontWeight: 600,
                                        },
                                        axisLine: { show: false },
                                        axisTick: { show: false },
                                    },
                                    yAxis: {
                                        type: "value",
                                        axisLabel: {
                                            fontSize: 9,
                                            color: "#94a3b8",
                                            formatter: (v) =>
                                                `₹${(v / 100000).toFixed(1)}L`,
                                        },
                                        axisLine: { show: false },
                                        splitLine: {
                                            lineStyle: { color: "#f1f5f9" },
                                        },
                                    },
                                    series: [
                                        {
                                            type: "bar",
                                            barMaxWidth: 48,
                                            data: byType.map((r, i) => ({
                                                value: r.amount ?? r.total,
                                                itemStyle: {
                                                    color: PAL[i % PAL.length],
                                                    borderRadius: [6, 6, 0, 0],
                                                },
                                                label: {
                                                    show: true,
                                                    position: "top",
                                                    formatter: (p) =>
                                                        fmtL(p.value),
                                                    fontSize: 9,
                                                    color: "#64748b",
                                                },
                                            })),
                                        },
                                    ],
                                }}
                            />
                        )}
                    </Section>
                </div>

                {/* Daily collection trend */}
                {(daily.length > 0 || trend.length > 0) && (
                    <Section title="Daily Collection Trend" icon={TrendingUp}>
                        {loadTrend ? (
                            <ChartSkeleton />
                        ) : (
                            (() => {
                                const d = daily.length > 0 ? daily : trend;
                                return (
                                    <EChart
                                        height={240}
                                        option={{
                                            grid: {
                                                top: 24,
                                                right: 16,
                                                bottom: 40,
                                                left: 8,
                                                containLabel: true,
                                            },
                                            tooltip: {
                                                trigger: "axis",
                                                ...TOOLTIP,
                                                formatter: (p) =>
                                                    `${p[0]?.axisValue}<br/>${p.map((s) => `${s.marker}${s.seriesName}: ${fmtRupee(s.value)}`).join("<br/>")}`,
                                            },
                                            legend: {
                                                bottom: 4,
                                                textStyle: {
                                                    fontSize: 10,
                                                    color: "#64748b",
                                                },
                                            },
                                            xAxis: {
                                                type: "category",
                                                data: d.map(
                                                    (r) => r.date ?? r.day,
                                                ),
                                                axisLabel: {
                                                    fontSize: 9,
                                                    color: "#94a3b8",
                                                    rotate: 30,
                                                },
                                                axisLine: { show: false },
                                                axisTick: { show: false },
                                            },
                                            yAxis: {
                                                type: "value",
                                                axisLabel: {
                                                    fontSize: 9,
                                                    color: "#94a3b8",
                                                    formatter: (v) =>
                                                        `₹${(v / 100000).toFixed(1)}L`,
                                                },
                                                axisLine: { show: false },
                                                splitLine: {
                                                    lineStyle: {
                                                        color: "#f1f5f9",
                                                    },
                                                },
                                            },
                                            series: [
                                                {
                                                    name: "Collection",
                                                    type: "line",
                                                    smooth: true,
                                                    symbol: "none",
                                                    data: d.map(
                                                        (r) =>
                                                            r.collection ??
                                                            r.net_collection ??
                                                            r.total_collection,
                                                    ),
                                                    lineStyle: {
                                                        width: 2,
                                                        color: "#1d4ed8",
                                                    },
                                                    areaStyle: {
                                                        opacity: 0.06,
                                                        color: "#1d4ed8",
                                                    },
                                                    itemStyle: {
                                                        color: "#1d4ed8",
                                                    },
                                                },
                                            ],
                                        }}
                                    />
                                );
                            })()
                        )}
                    </Section>
                )}

                {/* Transaction category breakdown */}
                {byTxn.length > 0 && (
                    <Section
                        title="Transaction Category Breakdown"
                        icon={Wallet}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-2 px-3 text-[10px] font-700 uppercase tracking-wider text-slate-400">
                                            Category
                                        </th>
                                        <th className="text-right py-2 px-3 text-[10px] font-700 uppercase tracking-wider text-slate-400">
                                            Amount
                                        </th>
                                        <th className="text-right py-2 px-3 text-[10px] font-700 uppercase tracking-wider text-slate-400">
                                            Share
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {byTxn.map((r, i) => (
                                        <tr
                                            key={r.category ?? i}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                                        style={{
                                                            background:
                                                                PAL[
                                                                    i %
                                                                        PAL.length
                                                                ],
                                                        }}
                                                    />
                                                    <span className="font-600 text-slate-700">
                                                        {r.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-700 text-slate-800 tabular-nums">
                                                {fmtRupee(r.amount ?? r.total)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-600 text-slate-500">
                                                {fmtPctN(
                                                    r.amount ?? r.total,
                                                    total,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}
            </main>
        </AppLayout>
    );
}
