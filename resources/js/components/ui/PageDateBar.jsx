/**
 * PageDateBar
 * A self-contained date-range filter bar for analytics pages.
 *
 * Props:
 *   from         {string}   Current "from" YYYY-MM-DD
 *   to           {string}   Current "to"   YYYY-MM-DD
 *   onRange      {fn}       Called with ({ from, to }) when the range changes
 *   accentColor  {string}   Tailwind color key: 'blue' | 'violet' | 'emerald' | 'green' | 'teal' (default 'blue')
 */
import { useState } from 'react';
import { Calendar, RefreshCw, ChevronDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectBranch, setBranch } from '../../store/reportSlice';
import { useBranches } from '../../hooks/useBranches';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { cn } from '../../utils/cn';
import { resolvePresetRange, today } from '../../utils/dateHelpers';
import { DATE_PRESETS } from '../../constants';

const ACCENT = {
    blue:    { chip: 'bg-blue-600   border-blue-600   text-white', ghost: 'border-slate-200 text-slate-500 hover:border-blue-300   hover:text-blue-700'   },
    violet:  { chip: 'bg-violet-600 border-violet-600 text-white', ghost: 'border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-700' },
    emerald: { chip: 'bg-emerald-600 border-emerald-600 text-white', ghost: 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700' },
    green:   { chip: 'bg-green-600  border-green-600  text-white', ghost: 'border-slate-200 text-slate-500 hover:border-green-300  hover:text-green-700'  },
    teal:    { chip: 'bg-teal-600   border-teal-600   text-white', ghost: 'border-slate-200 text-slate-500 hover:border-teal-300   hover:text-teal-700'   },
};

export function PageDateBar({ from, to, onRange, accentColor = 'blue', onRefresh, isRefreshing = false }) {
    const dispatch = useDispatch();
    const branch = useSelector(selectBranch);
    const { branches } = useBranches();
    const branchOptions = branches.map(b => ({ label: b.label, value: b.key }));

    const [activePreset, setActivePreset] = useState(() => {
        // Try to detect current preset by matching dates
        for (const p of DATE_PRESETS) {
            const r = resolvePresetRange(p.key);
            if (r.from === from && r.to === to) return p.key;
        }
        return '';
    });
    const [showCustom, setShowCustom] = useState(false);
    const [localFrom, setLocalFrom] = useState(from);
    const [localTo,   setLocalTo]   = useState(to);

    const todayStr = today();
    const colors   = ACCENT[accentColor] ?? ACCENT.blue;

    const applyPreset = (key) => {
        const r = resolvePresetRange(key);
        setActivePreset(key);
        setLocalFrom(r.from);
        setLocalTo(r.to);
        onRange({ from: r.from, to: r.to });
    };

    const applyCustom = () => {
        if (!localFrom || !localTo) return;
        setActivePreset('');
        onRange({ from: localFrom, to: localTo });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
            {/* Branch Filter */}
            <MultiSelectDropdown
                options={branchOptions}
                selected={branch}
                onChange={v => dispatch(setBranch(v))}
                defaultLabel="All Branches"
                className="w-48"
            />
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Calendar icon */}
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Preset chips */}
            <div className="flex gap-1.5 flex-wrap">
                {DATE_PRESETS.map(p => (
                    <button
                        key={p.key}
                        onClick={() => applyPreset(p.key)}
                        className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer',
                            activePreset === p.key ? colors.chip : colors.ghost
                        )}
                    >
                        {p.label}
                    </button>
                ))}

                {/* Custom toggle */}
                <button
                    onClick={() => setShowCustom(v => !v)}
                    className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-600 border transition-all cursor-pointer flex items-center gap-1',
                        showCustom ? 'bg-slate-700 border-slate-700 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                >
                    Custom <ChevronDown className={cn('w-3 h-3 transition-transform', showCustom && 'rotate-180')} />
                </button>
            </div>

            {/* Custom date inputs */}
            {showCustom && (
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">From</label>
                        <input type="date" value={localFrom} max={localTo || todayStr}
                            onChange={e => setLocalFrom(e.target.value)}
                            className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400 cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-700 uppercase tracking-wider text-slate-400">To</label>
                        <input type="date" value={localTo} min={localFrom} max={todayStr}
                            onChange={e => setLocalTo(e.target.value)}
                            className="border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400 cursor-pointer" />
                    </div>
                    <button
                        onClick={applyCustom}
                        disabled={!localFrom || !localTo}
                        className={cn(
                            'self-end px-3 py-1 rounded-lg text-[11px] font-600 transition-all cursor-pointer',
                            (!localFrom || !localTo) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-700'
                        )}
                    >
                        Apply
                    </button>
                </div>
            )}

            {/* Current range badge + refresh */}
            <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                    {from === to ? from : `${from} – ${to}`}
                </span>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        title="Refresh"
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-blue-600')} />
                    </button>
                )}
            </div>
        </div>
    );
}
