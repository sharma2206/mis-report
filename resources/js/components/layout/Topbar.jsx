import { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Download, RefreshCw, FileSpreadsheet, FileText, Table2, Printer, BarChart3, Clock,
} from 'lucide-react';
import {
    selectBranch, selectGlobalTo,
    setBranch,
} from '../../store/reportSlice';
import { misApi } from '../../services/api';
import { cn } from '../../utils/cn';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { resolvePresetRange, today } from '../../utils/dateHelpers';
import { triggerDownload } from '../../utils/download';
import { useBranches } from '../../hooks/useBranches';

// How long before we consider data "stale" and show the indicator (15 min)
const STALE_AFTER_MS = 15 * 60 * 1000;

function useUpdatedAgo(dataUpdatedAt) {
    const [label, setLabel] = useState(null);

    useEffect(() => {
        if (!dataUpdatedAt) { setLabel(null); return; }

        const compute = () => {
            const diff = Date.now() - dataUpdatedAt;
            if (diff < 60_000) { setLabel('just now'); return; }
            const mins = Math.floor(diff / 60_000);
            if (mins < 60) { setLabel(`${mins}m ago`); return; }
            setLabel(`${Math.floor(mins / 60)}h ago`);
        };

        compute();
        const id = setInterval(compute, 30_000);
        return () => clearInterval(id);
    }, [dataUpdatedAt]);

    const isStale = dataUpdatedAt && (Date.now() - dataUpdatedAt) > STALE_AFTER_MS;
    return { label, isStale };
}

export const Topbar = ({ onPrint, isLoading, dataUpdatedAt }) => {
    const dispatch  = useDispatch();
    const branch    = useSelector(selectBranch);
    const date      = useSelector(selectGlobalTo);
    const todayStr  = today();
    const dropRef   = useRef(null);

    const { branches }                         = useBranches();
    const { label: updatedLabel, isStale }     = useUpdatedAgo(dataUpdatedAt);

    // M-8: auto-reset branch if the stored value is not in the user's allowed list
    useEffect(() => {
        if (branches.length > 0 && branch && !branches.find(b => b.key === branch)) {
            dispatch(setBranch(branches[0].key));
        }
    }, [branches, branch, dispatch]);

    const [exporting,     setExporting]     = useState(null);
    const [brmFrom,       setBrmFrom]       = useState('');
    const [brmTo,         setBrmTo]         = useState('');
    const [showBrmPicker, setShowBrmPicker] = useState(false);

    const handleExport = async (type, fetchFn, ext) => {
        setExporting(type);
        const branchShort = branch?.slice(0, 3).toUpperCase() || 'RPT';
        const prefix      = type === 'brm' ? 'BRM' : 'MIS';
        await triggerDownload(fetchFn, `${prefix}-${branchShort}-${date}.${ext}`);
        setExporting(null);
        dropRef.current?.classList.add('hidden');
    };

    const handleBrmDownload = async (from, to) => {
        if (!from || !to) return;
        setExporting('brm');
        setShowBrmPicker(false);
        dropRef.current?.classList.add('hidden');
        const branchShort = branch?.slice(0, 3).toUpperCase() || 'RPT';
        const fromFmt = from.replace(/-/g, '');
        const toFmt   = to.replace(/-/g, '');
        await triggerDownload(
            () => misApi.exportBrm(branch, from, to),
            `BRM-${branchShort}-${fromFmt}-${toFmt}.xlsx`
        );
        setExporting(null);
    };

    const openBrmPicker = (preset) => {
        if (preset === 'week') {
            const r = resolvePresetRange('week');
            setBrmFrom(r.from); setBrmTo(r.to);
        } else if (preset === 'month') {
            const r = resolvePresetRange('mtd');
            setBrmFrom(r.from); setBrmTo(r.to);
        }
        setShowBrmPicker(true);
    };

    const handleBranch = (b) => dispatch(setBranch(b));
    const toggleDrop   = () => dropRef.current?.classList.toggle('hidden');

    return (
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 no-print">
            <div className="flex items-center gap-2.5 px-4 h-[54px]">
                {/* Branch selector pills — rendered from API / fallback constant */}
                <div className="flex gap-1.5 flex-shrink-0">
                    {branches.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => handleBranch(key)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-[12px] font-600 border-[1.5px] transition-all duration-150 cursor-pointer whitespace-nowrap',
                                branch === key
                                    ? 'bg-blue-700 border-blue-700 text-white shadow-sm shadow-blue-200'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

                {/* Date Range Filter */}
                <DateRangeFilter />

                {/* Loading / stale indicator */}
                <div className="flex items-center ml-2">
                    {isLoading ? (
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">Loading…</span>
                        </div>
                    ) : updatedLabel ? (
                        <div className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-500',
                            isStale
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-slate-50 text-slate-400 border border-slate-100',
                        )}>
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="hidden sm:inline">{updatedLabel}</span>
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-2 ml-auto items-center flex-shrink-0">
                    {/* Export dropdown */}
                    <div
                        className="relative"
                        onBlur={() => setTimeout(() => { dropRef.current?.classList.add('hidden'); setShowBrmPicker(false); }, 200)}
                    >
                        <button
                            onClick={toggleDrop}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border-[1.5px] border-slate-200 bg-white text-[13px] font-600 text-slate-700 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <div
                            ref={dropRef}
                            className="hidden absolute right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-lg min-w-[200px] z-50 overflow-hidden"
                            style={{ boxShadow: 'var(--shadow-dropdown)' }}
                        >
                            {[
                                { type: 'excel', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />, label: 'Excel (.xlsx)', ext: 'xlsx', fn: () => misApi.exportExcel(branch, date) },
                                { type: 'pdf',   icon: <FileText        className="w-4 h-4 text-red-600"     />, label: 'PDF Report',   ext: 'pdf',  fn: () => misApi.exportPdf(branch, date)   },
                                { type: 'csv',   icon: <Table2          className="w-4 h-4 text-amber-600"   />, label: 'CSV (Flat)',   ext: 'csv',  fn: () => misApi.exportCsv(branch, date)   },
                            ].map(({ type, icon, label, ext, fn }) => (
                                <button
                                    key={type}
                                    onClick={() => handleExport(type, fn, ext)}
                                    disabled={!!exporting}
                                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60 transition-colors"
                                >
                                    {exporting === type ? <RefreshCw className="w-4 h-4 animate-spin text-slate-400" /> : icon}
                                    {exporting === type ? 'Downloading…' : label}
                                </button>
                            ))}

                            <div className="border-t border-slate-100 mt-1 pt-1 px-4 pb-1">
                                <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-1">BRM Report</p>
                            </div>

                            {!showBrmPicker ? (
                                <>
                                    <button onClick={() => openBrmPicker('week')} disabled={!!exporting}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-sky-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60">
                                        <BarChart3 className="w-4 h-4 text-sky-600" /> This Week
                                    </button>
                                    <button onClick={() => openBrmPicker('month')} disabled={!!exporting}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-sky-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60">
                                        <BarChart3 className="w-4 h-4 text-sky-600" /> This Month
                                    </button>
                                    <button onClick={() => { setBrmFrom(date); setBrmTo(date); setShowBrmPicker(true); }} disabled={!!exporting}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-sky-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60">
                                        <BarChart3 className="w-4 h-4 text-slate-400" /> Custom Range
                                    </button>
                                </>
                            ) : (
                                <div className="px-4 pb-3 space-y-2">
                                    {[
                                        { label: 'From', val: brmFrom, set: setBrmFrom, min: undefined, max: todayStr },
                                        { label: 'To',   val: brmTo,   set: setBrmTo,   min: brmFrom,   max: todayStr },
                                    ].map(({ label, val, set, min, max }) => (
                                        <div key={label} className="flex flex-col gap-1">
                                            <label className="text-[10px] font-700 text-slate-500 uppercase tracking-wide">{label}</label>
                                            <input type="date" value={val} min={min} max={max}
                                                onChange={e => set(e.target.value)}
                                                className="border border-slate-200 rounded-md px-2 py-1 text-[12px] text-slate-800 outline-none focus:border-sky-500" />
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setShowBrmPicker(false)}
                                            className="flex-1 py-1.5 text-[12px] font-600 text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer bg-white">
                                            Back
                                        </button>
                                        <button onClick={() => handleBrmDownload(brmFrom, brmTo)}
                                            disabled={!brmFrom || !brmTo || !!exporting}
                                            className="flex-1 py-1.5 text-[12px] font-700 text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:opacity-60 cursor-pointer border-0 flex items-center justify-center gap-1">
                                            {exporting === 'brm' ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                                            {exporting === 'brm' ? 'Downloading…' : 'Download'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100" />
                            <button onClick={onPrint}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 w-full border-0 bg-transparent cursor-pointer text-left transition-colors">
                                <Printer className="w-4 h-4 text-violet-600" /> Print Preview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
