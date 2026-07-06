import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, FileText, Table2,
    BarChart3, Calendar, Clock, ChevronDown,
    RefreshCw, Download, Zap,
} from 'lucide-react';
import { selectBranch, selectDate } from '../../store/reportSlice';
import { misApi } from '../../services/api';
import { cn } from '../../utils/cn';
import { today } from '../../utils/dateHelpers';

const triggerDownload = async (fetchFn, filename) => {
    const res  = await fetchFn();
    const url  = URL.createObjectURL(new Blob([res.data]));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
};

export const QuickActions = ({ onGenerateMIS, onUpload }) => {
    const navigate  = useNavigate();
    const branch    = useSelector(selectBranch);
    const date      = useSelector(selectDate);
    const todayStr  = today();

    const [exporting, setExporting] = useState(null);
    const [showExport, setShowExport] = useState(false);
    const [showBrm, setShowBrm] = useState(false);
    const [brmFrom, setBrmFrom] = useState(date?.substring(0, 8) + '01');
    const [brmTo,   setBrmTo]   = useState(date || todayStr);

    const handleExport = async (type, fn, ext) => {
        setExporting(type);
        setShowExport(false);
        try {
            const branchShort = branch?.slice(0, 3).toUpperCase() || 'RPT';
            await triggerDownload(fn, `MIS-${branchShort}-${date}.${ext}`);
        } catch {
            // silent
        } finally {
            setExporting(null);
        }
    };

    const handleBrmDownload = async () => {
        if (!brmFrom || !brmTo) return;
        setExporting('brm');
        setShowBrm(false);
        try {
            const branchShort = branch?.slice(0, 3).toUpperCase() || 'RPT';
            await triggerDownload(
                () => misApi.exportBrm(branch, brmFrom, brmTo),
                `BRM-${branchShort}-${brmFrom}-${brmTo}.xlsx`
            );
        } catch {
            // silent
        } finally {
            setExporting(null);
        }
    };

    const actions = [
        {
            id: 'upload',
            icon: Upload,
            label: 'Upload Reports',
            color: 'blue',
            onClick: () => { onUpload?.(); navigate('/import'); },
        },
        {
            id: 'mis',
            icon: FileSpreadsheet,
            label: 'Generate MIS',
            color: 'emerald',
            onClick: onGenerateMIS,
            loading: exporting === 'mis',
        },
        {
            id: 'brm',
            icon: BarChart3,
            label: 'Generate BRM',
            color: 'sky',
            onClick: () => setShowBrm(v => !v),
        },
        {
            id: 'export',
            icon: Download,
            label: 'Export',
            color: 'violet',
            onClick: () => setShowExport(v => !v),
        },
        {
            id: 'schedule',
            icon: Clock,
            label: 'Schedule',
            color: 'amber',
            onClick: () => navigate('/scheduler'),
        },
    ];

    const colorMap = {
        blue:    'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
        sky:     'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300',
        violet:  'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
        amber:   'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Quick Actions</span>
            </div>

            <div className="p-3 flex flex-wrap gap-2">
                {actions.map(({ id, icon: Icon, label, color, onClick, loading }) => (
                    <div key={id} className="relative">
                        <button
                            onClick={onClick}
                            disabled={!!exporting}
                            className={cn(
                                'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-[1.5px] text-[11px] font-600',
                                'transition-all duration-150 cursor-pointer disabled:opacity-60 min-w-[76px]',
                                colorMap[color] || colorMap.blue,
                            )}
                        >
                            {loading
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Icon className="w-4 h-4" />
                            }
                            {label}
                        </button>

                        {/* Export sub-menu */}
                        {id === 'export' && (
                            <AnimatePresence>
                                {showExport && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute bottom-[calc(100%+6px)] left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[170px] overflow-hidden"
                                    >
                                        {[
                                            { type: 'excel', icon: FileSpreadsheet, label: 'Excel (.xlsx)', color: 'text-emerald-600', fn: () => misApi.exportExcel(branch, date), ext: 'xlsx' },
                                            { type: 'pdf',   icon: FileText,        label: 'PDF Report',   color: 'text-red-600',     fn: () => misApi.exportPdf(branch, date),   ext: 'pdf'  },
                                            { type: 'csv',   icon: Table2,          label: 'CSV (Flat)',   color: 'text-amber-600',   fn: () => misApi.exportCsv(branch, date),   ext: 'csv'  },
                                        ].map(({ type, icon: I, label: lbl, color: c, fn, ext }) => (
                                            <button key={type}
                                                onClick={() => handleExport(type, fn, ext)}
                                                disabled={!!exporting}
                                                className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-[12px] font-500 text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer text-left disabled:opacity-60"
                                            >
                                                <I className={cn('w-4 h-4', c)} />
                                                {exporting === type ? 'Downloading…' : lbl}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}

                        {/* BRM picker */}
                        {id === 'brm' && (
                            <AnimatePresence>
                                {showBrm && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute bottom-[calc(100%+6px)] left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[200px] space-y-2"
                                    >
                                        <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400">BRM Date Range</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { label: 'From', value: brmFrom, set: setBrmFrom, min: null, max: brmTo || todayStr },
                                                { label: 'To',   value: brmTo,   set: setBrmTo,   min: brmFrom, max: todayStr },
                                            ].map(({ label: lbl, value, set, min, max }) => (
                                                <div key={lbl}>
                                                    <label className="text-[9px] font-700 text-slate-400 uppercase tracking-wide block mb-0.5">{lbl}</label>
                                                    <input type="date" value={value} min={min || undefined} max={max}
                                                        onChange={e => set(e.target.value)}
                                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleBrmDownload}
                                            disabled={!brmFrom || !brmTo || !!exporting}
                                            className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[12px] font-700 cursor-pointer border-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {exporting === 'brm' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                                            {exporting === 'brm' ? 'Downloading…' : 'Download BRM'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
