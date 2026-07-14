import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { today, resolvePresetRange } from '../../utils/dateHelpers';
import {
    selectGlobalPreset, selectGlobalFrom, selectGlobalTo,
    setGlobalPreset, setGlobalRange,
} from '../../store/reportSlice';

const PRESETS = [
    { key: 'today',      label: 'Today'      },
    { key: 'yesterday',  label: 'Yesterday'  },
    { key: 'week',       label: 'This Week'  },
    { key: 'mtd',        label: 'MTD'        },
    { key: 'last_month', label: 'Last Month' },
];

function fmtDisplay(from, to) {
    if (!from) return 'Select range';
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    const f = new Date(from + 'T00:00:00').toLocaleDateString('en-IN', opts);
    const t = to ? new Date(to + 'T00:00:00').toLocaleDateString('en-IN', opts) : f;
    return from === to ? f : `${f} – ${t}`;
}

export const DateRangeFilter = ({ className }) => {
    const dispatch  = useDispatch();
    const preset    = useSelector(selectGlobalPreset);
    const from      = useSelector(selectGlobalFrom);
    const to        = useSelector(selectGlobalTo);
    const todayStr  = today();

    const [open,        setOpen]        = useState(false);
    const [customFrom,  setCustomFrom]  = useState(from);
    const [customTo,    setCustomTo]    = useState(to);
    const [showCustom,  setShowCustom]  = useState(!preset);

    const panelRef  = useRef(null);
    const triggerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Sync custom inputs when Redux changes externally
    useEffect(() => { setCustomFrom(from); setCustomTo(to); }, [from, to]);
    useEffect(() => { setShowCustom(!preset); }, [preset]);

    const handlePreset = (key) => {
        dispatch(setGlobalPreset(key));
        setShowCustom(false);
        setOpen(false);
    };

    const handleApply = () => {
        if (!customFrom || !customTo) return;
        dispatch(setGlobalRange({ from: customFrom, to: customTo }));
        setOpen(false);
    };

    const presetLabel = PRESETS.find(p => p.key === preset)?.label;

    return (
        <div className={cn('relative', className)}>
            {/* ── Trigger button ───────────────────────────────────────────── */}
            <button
                ref={triggerRef}
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-500',
                    'bg-white text-slate-700 border-slate-200 shadow-sm',
                    'hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer',
                    open && 'border-blue-400 ring-2 ring-blue-500/20 bg-white',
                )}
            >
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-[220px]">{fmtDisplay(from, to)}</span>
                {presetLabel && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-700 flex-shrink-0">
                        {presetLabel}
                    </span>
                )}
                <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
            </button>

            {/* ── Dropdown panel ───────────────────────────────────────────── */}
            {open && (
                <div
                    ref={panelRef}
                    className="absolute top-full mt-1.5 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72 p-3 space-y-3"
                >
                    {/* Preset grid */}
                    <div>
                        <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Quick Select</p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {PRESETS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => handlePreset(p.key)}
                                    className={cn(
                                        'flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-600 border transition-all cursor-pointer',
                                        preset === p.key
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
                                    )}
                                >
                                    {preset === p.key && <Check className="w-3 h-3 flex-shrink-0" />}
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100" />

                    {/* Custom range */}
                    <div>
                        <button
                            onClick={() => setShowCustom(v => !v)}
                            className="flex items-center justify-between w-full text-[10px] font-700 uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            <span>Custom Range</span>
                            <ChevronDown className={cn('w-3 h-3 transition-transform', showCustom && 'rotate-180')} />
                        </button>

                        {showCustom && (
                            <div className="mt-2 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-600 text-slate-400 mb-1">From</label>
                                        <input
                                            type="date"
                                            value={customFrom}
                                            max={customTo || todayStr}
                                            onChange={e => setCustomFrom(e.target.value)}
                                            className="w-full text-[12px] text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-600 text-slate-400 mb-1">To</label>
                                        <input
                                            type="date"
                                            value={customTo}
                                            min={customFrom}
                                            max={todayStr}
                                            onChange={e => setCustomTo(e.target.value)}
                                            className="w-full text-[12px] text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleApply}
                                    disabled={!customFrom || !customTo}
                                    className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-600 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Apply Range
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Current selection summary */}
                    {(from && to) && (
                        <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-500">Selected</span>
                            <span className="text-[11px] font-700 text-slate-700">{fmtDisplay(from, to)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
