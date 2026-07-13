import { useDispatch, useSelector } from 'react-redux';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
import { today } from '../../utils/dateHelpers';
import {
    selectGlobalPreset, selectGlobalFrom, selectGlobalTo,
    setGlobalPreset, setGlobalRange,
} from '../../store/reportSlice';

const PRESETS = [
    { key: 'today',      label: 'Today'     },
    { key: 'yesterday',  label: 'Yesterday' },
    { key: 'week',       label: 'This Week' },
    { key: 'mtd',        label: 'MTD'       },
    { key: 'last_month', label: 'Last Month'},
];

export const DateRangeFilter = ({ className }) => {
    const dispatch = useDispatch();
    const preset   = useSelector(selectGlobalPreset);
    const from     = useSelector(selectGlobalFrom);
    const to       = useSelector(selectGlobalTo);
    const todayStr = today();

    return (
        <div className={cn(
            'flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200',
            className,
        )}>
            {/* Calendar icon */}
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Preset pills */}
            <div className="flex items-center gap-1">
                {PRESETS.map(p => (
                    <button
                        key={p.key}
                        onClick={() => dispatch(setGlobalPreset(p.key))}
                        className={cn(
                            'px-3 py-1 rounded-full text-[12px] font-600 border transition-all cursor-pointer',
                            preset === p.key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* FROM / TO date inputs */}
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[9px] font-700 uppercase tracking-wide text-slate-400">From</span>
                    <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={e => dispatch(setGlobalRange({ from: e.target.value, to }))}
                        className="text-[12px] font-500 text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white cursor-pointer"
                    />
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[9px] font-700 uppercase tracking-wide text-slate-400">To</span>
                    <input
                        type="date"
                        value={to}
                        min={from}
                        max={todayStr}
                        onChange={e => dispatch(setGlobalRange({ from, to: e.target.value }))}
                        className="text-[12px] font-500 text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};
