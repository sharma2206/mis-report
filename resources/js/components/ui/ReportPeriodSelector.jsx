import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Clock, Upload, CheckCircle2, X } from 'lucide-react';
import {
    selectBranch, selectDate, selectPeriodMode, selectPeriodPreset,
    selectPeriodFrom, selectPeriodTo, selectLastImportInfo,
    setDate, setPeriodPreset, setPeriodRange, setPeriodMode,
} from '../../store/reportSlice';
import { resolvePresetRange, formatDateRange, formatDisplayDate, today } from '../../utils/dateHelpers';
import { cn } from '../../utils/cn';

const PRESETS = [
    { key: 'today',      label: 'Today' },
    { key: 'yesterday',  label: 'Yesterday' },
    { key: 'week',       label: 'This Week' },
    { key: 'mtd',        label: 'MTD' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'custom',     label: 'Custom' },
];

const PRESET_COLORS = {
    today:      'text-blue-700 bg-blue-50 border-blue-200',
    yesterday:  'text-slate-700 bg-slate-50 border-slate-200',
    week:       'text-violet-700 bg-violet-50 border-violet-200',
    mtd:        'text-emerald-700 bg-emerald-50 border-emerald-200',
    last_month: 'text-amber-700 bg-amber-50 border-amber-200',
    custom:     'text-rose-700 bg-rose-50 border-rose-200',
};

export const ReportPeriodSelector = ({ onLoad }) => {
    const dispatch     = useDispatch();
    const branch       = useSelector(selectBranch);
    const date         = useSelector(selectDate);
    const periodMode   = useSelector(selectPeriodMode);
    const periodPreset = useSelector(selectPeriodPreset);
    const periodFrom   = useSelector(selectPeriodFrom);
    const periodTo     = useSelector(selectPeriodTo);
    const importInfo   = useSelector(selectLastImportInfo);

    const todayStr  = today();
    const [open, setOpen]       = useState(false);
    const [customFrom, setCustomFrom] = useState(periodFrom || todayStr);
    const [customTo,   setCustomTo]   = useState(periodTo   || todayStr);

    // Compute display label
    const displayRange = () => {
        if (periodMode === 'auto') {
            return { label: 'Auto Detect', range: formatDisplayDate(date) };
        }
        if (periodMode === 'custom') {
            return { label: 'Custom Range', range: formatDateRange(periodFrom, periodTo) };
        }
        const r = resolvePresetRange(periodPreset);
        return { label: PRESETS.find(p => p.key === periodPreset)?.label || '', range: formatDateRange(r.from, r.to) };
    };

    const { label: modeLabel, range: rangeStr } = displayRange();

    const handlePreset = (key) => {
        if (key === 'custom') {
            dispatch(setPeriodMode('custom'));
            setOpen(false);
            return;
        }
        const r = resolvePresetRange(key);
        dispatch(setPeriodPreset(key));
        dispatch(setDate(r.to));
        onLoad(r.from, r.to);
        setOpen(false);
    };

    const handleAutoDetect = () => {
        dispatch(setPeriodMode('auto'));
        onLoad(null, date);
        setOpen(false);
    };

    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        dispatch(setPeriodRange({ from: customFrom, to: customTo }));
        dispatch(setDate(customTo));
        onLoad(customFrom, customTo);
        setOpen(false);
    };

    const isCustom = periodMode === 'custom';

    return (
        <div className="flex items-center gap-2">
            {/* Main Period Button */}
            <div className="relative">
                <button
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border-[1.5px] text-[13px] font-600 transition-all cursor-pointer',
                        'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700',
                    )}
                >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="max-w-[140px] truncate">{rangeStr || modeLabel}</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
                </button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl min-w-[280px] overflow-hidden"
                        >
                            {/* Auto Detect */}
                            <div className="px-3 pt-3 pb-2">
                                <p className="text-[9px] font-700 uppercase tracking-widest text-slate-400 mb-2">Period Mode</p>
                                <button
                                    onClick={handleAutoDetect}
                                    className={cn(
                                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-600 transition-all border-[1.5px] cursor-pointer mb-1',
                                        periodMode === 'auto'
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50',
                                    )}
                                >
                                    {periodMode === 'auto'
                                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                        : <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />}
                                    <span>Auto Detect from CSV</span>
                                    {periodMode === 'auto' && (
                                        <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-600">Default</span>
                                    )}
                                </button>
                            </div>

                            {/* Quick Presets */}
                            <div className="px-3 pb-2">
                                <p className="text-[9px] font-700 uppercase tracking-widest text-slate-400 mb-2">Quick Filters</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {PRESETS.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            onClick={() => handlePreset(key)}
                                            className={cn(
                                                'px-2 py-1.5 rounded-lg text-[11px] font-600 border-[1.5px] transition-all cursor-pointer text-center',
                                                (periodMode !== 'auto' && (
                                                    (key !== 'custom' && periodPreset === key) ||
                                                    (key === 'custom' && periodMode === 'custom')
                                                ))
                                                    ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white border-transparent shadow-sm'
                                                    : `${PRESET_COLORS[key] || 'text-slate-700 bg-slate-50 border-slate-200'} hover:brightness-95`,
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom range inputs */}
                            {isCustom && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-3 pb-3 border-t border-slate-100 pt-2.5"
                                >
                                    <p className="text-[9px] font-700 uppercase tracking-widest text-slate-400 mb-2">Custom Range</p>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="text-[10px] font-700 text-slate-500 uppercase tracking-wide block mb-1">From</label>
                                            <input
                                                type="date" value={customFrom} max={customTo || todayStr}
                                                onChange={e => setCustomFrom(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-700 text-slate-500 uppercase tracking-wide block mb-1">To</label>
                                            <input
                                                type="date" value={customTo} min={customFrom} max={todayStr}
                                                onChange={e => setCustomTo(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        disabled={!customFrom || !customTo}
                                        className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-700 cursor-pointer border-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
                                    >
                                        Apply Range
                                    </button>
                                </motion.div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={() => setOpen(false)}
                                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center cursor-pointer border-0"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Active period badge */}
            <div className="hidden sm:flex items-center gap-1.5">
                <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-700 border',
                    periodMode === 'auto'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : (periodMode === 'custom'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : `${PRESET_COLORS[periodPreset] || 'bg-slate-50 border-slate-200 text-slate-700'}`),
                )}>
                    {modeLabel}
                </span>
            </div>

            {/* Last import info */}
            {importInfo && (
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 border-l border-slate-200 pl-2.5 ml-0.5">
                    <Upload className="w-3 h-3 text-emerald-500" />
                    <span>Last import: <strong className="text-slate-600 font-600">{formatDisplayDate(importInfo.date)}</strong></span>
                    {importInfo.file && <span className="text-slate-400">({importInfo.file})</span>}
                </div>
            )}
        </div>
    );
};
