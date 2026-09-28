import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar, ChevronDown, Clock, ScanLine, AlertTriangle,
    CheckCircle2, X, User, Building2, FileText, Layers,
} from 'lucide-react';
import {
    selectBranch, selectDate, selectPeriodMode, selectPeriodPreset,
    selectPeriodFrom, selectPeriodTo, selectLastImportInfo,
    setDate, setPeriodPreset, setPeriodRange, setPeriodMode,
} from '../../store/reportSlice';
import { resolvePresetRange, formatDisplayDate, formatDateRange, today } from '../../utils/dateHelpers';
import { cn } from '../../utils/cn';

// ── Quick filter presets (manual mode only) ────────────────────────────────
const PRESETS = [
    { key: 'today',      label: 'Today'      },
    { key: 'yesterday',  label: 'Yesterday'  },
    { key: 'week',       label: 'This Week'  },
    { key: 'mtd',        label: 'MTD'        },
    { key: 'last_month', label: 'Last Month' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
         + ' · '
         + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Returns true when any file's from/to differs from the others.
function detectMismatch(perFilePeriods) {
    if (!perFilePeriods || perFilePeriods.length < 2) return false;
    const froms = new Set(perFilePeriods.map(p => p.from));
    const tos   = new Set(perFilePeriods.map(p => p.to));
    return froms.size > 1 || tos.size > 1;
}

// ── Component ──────────────────────────────────────────────────────────────
export const ReportPeriodSelector = ({ onLoad }) => {
    const dispatch     = useDispatch();
    const date         = useSelector(selectDate);
    const periodMode   = useSelector(selectPeriodMode);
    const periodPreset = useSelector(selectPeriodPreset);
    const periodFrom   = useSelector(selectPeriodFrom);
    const periodTo     = useSelector(selectPeriodTo);
    const importInfo   = useSelector(selectLastImportInfo);

    const todayStr = today();
    const [open,       setOpen]       = useState(false);
    const [customFrom, setCustomFrom] = useState(periodFrom || todayStr);
    const [customTo,   setCustomTo]   = useState(periodTo   || todayStr);

    const isAuto   = periodMode === 'auto';
    const isCustom = periodMode === 'custom';

    // ── Auto-detect metadata ───────────────────────────────────────────────
    const autoFrom = importInfo?.periodFrom ?? importInfo?.date ?? null;
    const autoTo   = importInfo?.periodTo   ?? importInfo?.date ?? null;
    const hasMismatch = detectMismatch(importInfo?.perFilePeriods);

    // ── Topbar button label ────────────────────────────────────────────────
    const buttonLabel = (() => {
        if (isAuto) {
            if (!autoFrom) return 'Auto Detect';
            return autoFrom === autoTo
                ? fmtShort(autoTo)
                : `${fmtShort(autoFrom)} → ${fmtShort(autoTo)}`;
        }
        if (isCustom) return formatDateRange(periodFrom, periodTo) || 'Custom Range';
        const r = resolvePresetRange(periodPreset);
        return formatDateRange(r.from, r.to);
    })();

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleAutoDetect = () => {
        dispatch(setPeriodMode('auto'));
        // Drive the dashboard with the stored import period — never today's date.
        if (autoTo) {
            dispatch(setDate(autoTo));
            onLoad(autoFrom, autoTo);
        }
        setOpen(false);
    };

    const handlePreset = (key) => {
        const r = resolvePresetRange(key);
        dispatch(setPeriodPreset(key));
        dispatch(setDate(r.to));
        onLoad(r.from, r.to);
        setOpen(false);
    };

    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        dispatch(setPeriodRange({ from: customFrom, to: customTo }));
        dispatch(setDate(customTo));
        onLoad(customFrom, customTo);
        setOpen(false);
    };

    const switchToManual = () => {
        // Switch to preset mode without changing the visible date until the user picks one.
        dispatch(setPeriodMode('preset'));
    };

    return (
        <div className="flex items-center gap-2">
            {/* ── Topbar trigger button ─────────────────────────────────── */}
            <div className="relative">
                <button
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border-[1.5px] text-[13px] font-600 transition-all cursor-pointer whitespace-nowrap',
                        isAuto
                            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:border-blue-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700',
                    )}
                >
                    <Calendar className={cn('w-3.5 h-3.5', isAuto ? 'text-blue-500' : 'text-slate-400')} />
                    <span className="max-w-[200px] truncate">{buttonLabel}</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
                </button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-[320px] overflow-hidden"
                            style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.04)' }}
                        >
                            {/* ── Close ─────────────────────────────────── */}
                            <button
                                onClick={() => setOpen(false)}
                                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center cursor-pointer border-0 z-10"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* ── Section 1: Auto Detect ────────────────── */}
                            <div className="px-4 pt-4 pb-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <ScanLine className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-700 uppercase tracking-widest text-slate-400">Auto Detect</span>
                                </div>

                                {importInfo && autoFrom ? (
                                    <div
                                        onClick={handleAutoDetect}
                                        className={cn(
                                            'rounded-xl border-[1.5px] p-3 cursor-pointer transition-all',
                                            isAuto
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50',
                                        )}
                                    >
                                        {/* Period row */}
                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                            <div>
                                                <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-0.5">
                                                    Report Period
                                                </div>
                                                <div className={cn(
                                                    'text-[14px] font-700 leading-tight',
                                                    isAuto ? 'text-blue-800' : 'text-slate-800',
                                                )}>
                                                    {autoFrom === autoTo
                                                        ? fmtShort(autoTo)
                                                        : <>{fmtShort(autoFrom)}<span className="mx-1.5 text-slate-400 font-400">→</span>{fmtShort(autoTo)}</>
                                                    }
                                                </div>
                                            </div>
                                            {isAuto && (
                                                <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            )}
                                        </div>

                                        {/* Metadata grid */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Calendar className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                <span className="truncate">{fmtDateTime(importInfo.uploadedAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <User className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                <span className="truncate">{importInfo.uploadedBy || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Building2 className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                <span className="truncate capitalize">{importInfo.branch || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Layers className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                <span className="truncate">{importInfo.detectedSource || 'CSV Auto-Scan'}</span>
                                            </div>
                                            {importInfo.files?.length > 0 && (
                                                <div className="col-span-2 flex items-start gap-1.5 text-slate-500">
                                                    <FileText className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" />
                                                    <span>{importInfo.files.join(', ')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Per-file mismatch warning */}
                                        {hasMismatch && (
                                            <div className="mt-2.5 border-t border-amber-200 pt-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-700 text-amber-700 mb-1.5">
                                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                    Date range mismatch across files
                                                </div>
                                                <div className="space-y-0.5">
                                                    {importInfo.perFilePeriods.map((p) => (
                                                        <div key={p.typeKey} className="flex items-center justify-between text-[10px]">
                                                            <span className="text-slate-600 font-600">{p.label}</span>
                                                            <span className={cn(
                                                                'font-600',
                                                                (p.from !== autoFrom || p.to !== autoTo)
                                                                    ? 'text-amber-700'
                                                                    : 'text-slate-400',
                                                            )}>
                                                                {p.from === p.to
                                                                    ? fmtShort(p.to)
                                                                    : `${fmtShort(p.from)} → ${fmtShort(p.to)}`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* No import data yet */
                                    <div className={cn(
                                        'rounded-xl border-[1.5px] p-3 transition-all',
                                        isAuto
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-slate-50 border-slate-200',
                                    )}>
                                        <div className="flex items-center gap-2 text-[12px] text-slate-400 mb-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            No import data for this branch
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Upload CSVs in the Import Center to enable auto-detect.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ── Divider ───────────────────────────────── */}
                            <div className="mx-4 border-t border-slate-100" />

                            {/* ── Section 2: Manual / Quick Filters ────── */}
                            <div className={cn('px-4 pt-3 pb-4', isAuto && 'opacity-40 pointer-events-none select-none')}>
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-700 uppercase tracking-widest text-slate-400">
                                            Manual Mode
                                        </span>
                                    </div>
                                    {isAuto && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); switchToManual(); }}
                                            className="text-[10px] font-700 text-blue-600 hover:text-blue-800 cursor-pointer pointer-events-auto"
                                        >
                                            Switch to Manual
                                        </button>
                                    )}
                                </div>

                                {/* Quick filter pills */}
                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                    {PRESETS.map(({ key, label }) => {
                                        const active = !isAuto && periodMode === 'preset' && periodPreset === key;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handlePreset(key)}
                                                className={cn(
                                                    'px-2 py-1.5 rounded-lg text-[11px] font-600 border-[1.5px] transition-all cursor-pointer text-center',
                                                    active
                                                        ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white border-transparent shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700',
                                                )}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                    {/* Custom trigger */}
                                    <button
                                        onClick={() => { dispatch(setPeriodMode('custom')); }}
                                        className={cn(
                                            'px-2 py-1.5 rounded-lg text-[11px] font-600 border-[1.5px] transition-all cursor-pointer text-center',
                                            isCustom
                                                ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-transparent shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600',
                                        )}
                                    >
                                        Custom
                                    </button>
                                </div>

                                {/* Custom range inputs — only shown in custom mode */}
                                <AnimatePresence>
                                    {isCustom && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-slate-100 pt-3">
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    {[
                                                        { label: 'From', val: customFrom, set: setCustomFrom, max: customTo || todayStr, min: undefined },
                                                        { label: 'To',   val: customTo,   set: setCustomTo,   max: todayStr,              min: customFrom },
                                                    ].map(({ label, val, set, min, max }) => (
                                                        <div key={label}>
                                                            <label className="block text-[10px] font-700 uppercase tracking-wide text-slate-500 mb-1">
                                                                {label}
                                                            </label>
                                                            <input
                                                                type="date" value={val} min={min} max={max}
                                                                onChange={e => set(e.target.value)}
                                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={handleCustomApply}
                                                    disabled={!customFrom || !customTo}
                                                    className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-700 cursor-pointer border-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
                                                >
                                                    Apply Range
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Mode badge (topbar, always visible) ───────────────────── */}
            <span className={cn(
                'hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-700 border whitespace-nowrap',
                isAuto
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : isCustom
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500',
            )}>
                {isAuto ? 'Auto' : isCustom ? 'Custom' : (PRESETS.find(p => p.key === periodPreset)?.label ?? 'Manual')}
            </span>
        </div>
    );
};
