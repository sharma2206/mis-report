import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Download, RefreshCw, FileSpreadsheet, FileText, Table2, Printer, BarChart3, Calendar } from 'lucide-react';
import { selectBranch, selectDate, setBranch, setDate } from '../../store/reportSlice';
import { misApi } from '../../services/api';
import { shiftDate, resolvePreset } from '../../utils/dateHelpers';
import { BRANCHES, DATE_PRESETS } from '../../constants';
import { cn } from '../../utils/cn';

const triggerDownload = async (fetchFn, filename) => {
    try {
        const res  = await fetchFn();
        const url  = URL.createObjectURL(new Blob([res.data]));
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch {
        alert('Download failed. Please try again.');
    }
};

// Return Monday of the week containing `dateStr`
const weekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
};

// Return Sunday of the week containing `dateStr`
const weekEnd = (dateStr) => {
    const d = new Date(weekStart(dateStr));
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
};

// Return first day of the month of `dateStr`
const monthStart = (dateStr) => dateStr.slice(0, 8) + '01';

// Return last day of the month of `dateStr`
const monthEnd = (dateStr) => {
    const [y, m] = dateStr.split('-').map(Number);
    return new Date(y, m, 0).toISOString().split('T')[0];
};

const fmtDate = (d) => d; // already Y-m-d

export const Topbar = ({ onLoad, isLoading, onPrint }) => {
    const dispatch   = useDispatch();
    const branch     = useSelector(selectBranch);
    const date       = useSelector(selectDate);
    const todayStr   = new Date().toISOString().split('T')[0];
    const dropRef    = useRef(null);
    const brmRef     = useRef(null);
    const [exporting, setExporting] = useState(null);
    const [brmFrom, setBrmFrom]     = useState('');
    const [brmTo,   setBrmTo]       = useState('');
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
            setBrmFrom(weekStart(date));
            setBrmTo(weekEnd(date));
        } else if (preset === 'month') {
            setBrmFrom(monthStart(date));
            setBrmTo(monthEnd(date));
        }
        setShowBrmPicker(true);
    };

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
                <div className="relative" onBlur={() => setTimeout(() => { dropRef.current?.classList.add('hidden'); setShowBrmPicker(false); }, 200)}>
                    <button
                        onClick={toggleDrop}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border-[1.5px] border-slate-200 bg-white text-[13px] font-600 text-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-700 transition-all cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <div ref={dropRef} className="hidden absolute right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-lg min-w-[200px] z-50 overflow-hidden">
                        {/* MIS exports */}
                        {[
                            { type: 'excel', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />, label: 'Excel (.xlsx)', ext: 'xlsx', fn: () => misApi.exportExcel(branch, date) },
                            { type: 'pdf',   icon: <FileText        className="w-4 h-4 text-red-600"     />, label: 'PDF Report',   ext: 'pdf',  fn: () => misApi.exportPdf(branch, date) },
                            { type: 'csv',   icon: <Table2          className="w-4 h-4 text-amber-600"   />, label: 'CSV (Flat)',   ext: 'csv',  fn: () => misApi.exportCsv(branch, date) },
                        ].map(({ type, icon, label, ext, fn }) => (
                            <button key={type}
                                onClick={() => handleExport(type, fn, ext)}
                                disabled={!!exporting}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60">
                                {exporting === type ? <RefreshCw className="w-4 h-4 animate-spin text-slate-400" /> : icon}
                                {exporting === type ? 'Downloading…' : label}
                            </button>
                        ))}

                        {/* BRM section */}
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
                                    <Calendar className="w-4 h-4 text-sky-600" /> This Month
                                </button>
                                <button onClick={() => { setBrmFrom(date); setBrmTo(date); setShowBrmPicker(true); }} disabled={!!exporting}
                                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-sky-50 w-full border-0 bg-transparent cursor-pointer text-left disabled:opacity-60">
                                    <Calendar className="w-4 h-4 text-slate-400" /> Custom Range
                                </button>
                            </>
                        ) : (
                            <div className="px-4 pb-3 space-y-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-700 text-slate-500 uppercase tracking-wide">From</label>
                                    <input type="date" value={brmFrom} max={todayStr}
                                        onChange={e => setBrmFrom(e.target.value)}
                                        className="border border-slate-200 rounded-md px-2 py-1 text-[12px] text-slate-800 outline-none focus:border-sky-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-700 text-slate-500 uppercase tracking-wide">To</label>
                                    <input type="date" value={brmTo} min={brmFrom} max={todayStr}
                                        onChange={e => setBrmTo(e.target.value)}
                                        className="border border-slate-200 rounded-md px-2 py-1 text-[12px] text-slate-800 outline-none focus:border-sky-500" />
                                </div>
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
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-500 text-slate-700 hover:bg-slate-50 w-full border-0 bg-transparent cursor-pointer text-left">
                            <Printer className="w-4 h-4 text-violet-600" /> Print Preview
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
