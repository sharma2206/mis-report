import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Download, RefreshCw, FileSpreadsheet, FileText, Table2, Printer } from 'lucide-react';
import { selectBranch, selectDate, setBranch, setDate } from '../../store/reportSlice';
import { misApi } from '../../services/api';
import { shiftDate, resolvePreset } from '../../utils/dateHelpers';
import { BRANCHES, DATE_PRESETS } from '../../constants';
import { cn } from '../../utils/cn';

export const Topbar = ({ onLoad, isLoading, onPrint }) => {
    const dispatch = useDispatch();
    const branch   = useSelector(selectBranch);
    const date     = useSelector(selectDate);
    const todayStr = new Date().toISOString().split('T')[0];
    const dropRef  = useRef(null);

    const handleShift = (d) => {
        const next = shiftDate(date, d);
        if (next <= todayStr) { dispatch(setDate(next)); onLoad(); }
    };

    const handlePreset = (preset) => {
        const next = resolvePreset(preset);
        if (next <= todayStr) { dispatch(setDate(next)); onLoad(); }
    };

    const handleBranch = (b) => {
        dispatch(setBranch(b));
        onLoad();
    };

    const toggleDrop = () => dropRef.current?.classList.toggle('hidden');

    return (
        <header className="sticky top-0 z-40 h-[58px] bg-white border-b border-slate-200 shadow-sm flex items-center gap-2.5 px-5 flex-shrink-0">
            {/* Branch pills */}
            <div className="flex gap-1.5">
                {Object.entries(BRANCHES).map(([key, { label }]) => (
                    <button
                        key={key}
                        onClick={() => handleBranch(key)}
                        className={cn(
                            'px-3.5 py-1.5 rounded-full text-[13px] font-600 border-[1.5px] transition-all duration-150 cursor-pointer',
                            branch === key
                                ? 'bg-blue-700 border-blue-700 text-white shadow-md shadow-blue-200'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

            {/* Date nav */}
            <div className="flex items-center gap-1">
                <button onClick={() => handleShift(-1)} className="w-7 h-7 rounded-lg border-[1.5px] border-slate-200 bg-white text-slate-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                    type="date"
                    value={date}
                    max={todayStr}
                    onChange={e => dispatch(setDate(e.target.value))}
                    className="px-2.5 py-1.5 border-[1.5px] border-slate-200 rounded-lg text-[13px] font-500 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                />
                <button onClick={() => handleShift(1)} className="w-7 h-7 rounded-lg border-[1.5px] border-slate-200 bg-white text-slate-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Presets */}
            <div className="hidden sm:flex gap-1">
                {DATE_PRESETS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handlePreset(key)}
                        className="px-2.5 py-1 rounded-md border-[1.5px] border-slate-200 text-[11px] font-600 text-slate-500 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 ml-auto items-center">
                {/* Load / Refresh */}
                <button
                    onClick={onLoad}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-violet-600 text-white text-[13px] font-600 rounded-lg shadow-md hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
                >
                    <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                    {isLoading ? 'Loading…' : 'Load Report'}
                </button>

                {/* Export dropdown */}
                <div className="relative" onBlur={() => setTimeout(() => dropRef.current?.classList.add('hidden'), 150)}>
                    <button
                        onClick={toggleDrop}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] border-slate-200 bg-white text-[13px] font-600 text-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-700 transition-all cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <div ref={dropRef} className="hidden absolute right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-lg min-w-[170px] z-50 overflow-hidden">
                        <a href={misApi.exportExcel(branch, date)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 no-underline">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (.xlsx)
                        </a>
                        <a href={misApi.exportPdf(branch, date)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 no-underline">
                            <FileText className="w-4 h-4 text-red-600" /> PDF Report
                        </a>
                        <a href={misApi.exportCsv(branch, date)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 no-underline">
                            <Table2 className="w-4 h-4 text-amber-600" /> CSV (Flat)
                        </a>
                        <button onClick={onPrint}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 w-full border-0 bg-transparent cursor-pointer text-left">
                            <Printer className="w-4 h-4 text-violet-600" /> Print Preview
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
