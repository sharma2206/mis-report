import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    FileText, CreditCard, Package, AlertTriangle, Hotel, Stethoscope,
    UploadCloud as UploadIcon, RotateCcw, CheckCircle, XCircle, LayoutDashboard, LogOut,
    Hospital, ChevronLeft, BedDouble,
} from 'lucide-react';
import { misApi } from '../services/api';
import { setBranch, setDate, selectBranch } from '../store/reportSlice';
import { selectUser } from '../store/authSlice';
import { useAuth } from '../hooks/useAuth';
import { BRANCHES } from '../constants';
import { cn } from '../utils/cn';

const today = () => new Date().toISOString().split('T')[0];

const FILE_DEFS = [
    { name: 'bill_file',     label: 'Bill Item Report',     Icon: FileText,    required: true,  sub: '.csv / .xlsx' },
    { name: 'cashier_file',  label: 'Cashier Collection',   Icon: CreditCard,  required: true,  sub: '.csv / .xlsx' },
    { name: 'package_file',  label: 'Package Consumption',  Icon: Package,     required: 'chromepet', sub: 'Chromepet only' },
    { name: 'er_file',       label: 'ER Admission',         Icon: AlertTriangle, required: false, sub: 'Auto-derives ER count' },
    { name: 'ip_file',       label: 'IP Admission',         Icon: Hotel,       required: false, sub: 'Auto-derives adm & disc' },
    { name: 'surgery_file',  label: 'Surgery Detail',       Icon: Stethoscope, required: false, sub: 'OT & surgeon analytics' },
];

const FileZone = ({ name, label, Icon, required, sub, branch, file, onChange }) => {
    const isRequired = required === true || (required === 'chromepet' && branch === 'chromepet');
    const skip = required === 'chromepet' && branch !== 'chromepet';
    if (skip) return null;

    return (
        <label className={cn(
            'relative flex items-center gap-2.5 p-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all group',
            file ? 'border-emerald-400 border-solid bg-emerald-50/50' : 'border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300',
        )}>
            {isRequired && <span className="absolute top-1 right-1.5 text-[10px] text-red-500 font-700">*</span>}
            <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                file ? 'bg-emerald-100' : 'bg-slate-200 group-hover:bg-blue-100',
            )}>
                <Icon className={cn('w-4 h-4', file ? 'text-emerald-600' : 'text-slate-500 group-hover:text-blue-600')} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-[12px] font-600 text-slate-700 truncate">{file ? file.name : label}</div>
                <div className={cn('text-[11px] truncate', file ? 'text-emerald-600 font-500' : 'text-slate-400')}>{file ? `${(file.size / 1024).toFixed(0)} KB` : sub}</div>
            </div>
            <input type="file" name={name} accept=".csv,.txt,.xlsx,.xls" className="sr-only" onChange={onChange} required={isRequired} />
        </label>
    );
};

export default function Upload() {
    const dispatch  = useDispatch();
    const navigate  = useNavigate();
    const { logout } = useAuth();
    const user      = useSelector(selectUser);
    const storedBranch = useSelector(selectBranch);

    const [branch, setBranchLocal] = useState(storedBranch || 'chromepet');
    const [date, setDateLocal]     = useState(today());
    const [files, setFiles]        = useState({});
    const [occupancy, setOccupancy] = useState('');
    const [admission, setAdmission] = useState('');
    const [discharge, setDischarge] = useState('');
    const [erCount,   setErCount]   = useState('');
    const [loading,   setLoading]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [alertMsg,  setAlertMsg]  = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const beds     = BRANCHES[branch]?.beds || 74;
    const occPct   = occupancy ? ((parseInt(occupancy) / beds) * 100).toFixed(2) : null;
    const name     = user?.name || user?.email || 'User';
    const initial  = name.charAt(0).toUpperCase();

    const onFile = (e) => {
        const { name: n, files: fl } = e.target;
        setFiles(prev => ({ ...prev, [n]: fl[0] || null }));
    };

    const selectBranchLocal = (b) => {
        setBranchLocal(b);
        if (b !== 'chromepet') setFiles(prev => ({ ...prev, package_file: null }));
    };

    const reset = () => {
        setFiles({}); setOccupancy(''); setAdmission(''); setDischarge(''); setErCount('');
        setResult(null); setAlertMsg(null); setBranchLocal('chromepet');
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setAlertMsg(null); setResult(null); setLoading(true);

        const fd = new FormData();
        fd.append('branch', branch);
        fd.append('date', date);
        if (occupancy)  fd.append('occupancy', occupancy);
        if (occPct)     fd.append('occupancy_pct', occPct);
        if (admission)  fd.append('admission', admission);
        if (discharge)  fd.append('discharge', discharge);
        if (erCount)    fd.append('er_count', erCount);
        Object.entries(files).forEach(([k, v]) => { if (v) fd.append(k, v); });

        try {
            const { data } = await misApi.upload(branch, fd);
            if (data.success) {
                toast.success(data.message || 'Upload successful!');
                setResult(data);
                dispatch(setBranch(branch));
                dispatch(setDate(date));
                sessionStorage.setItem('mis_last_branch', branch);
                sessionStorage.setItem('mis_last_date', date);
                setTimeout(() => navigate('/dashboard'), 1800);
            } else {
                const msg = data.message || Object.values(data.errors || {}).flat().join(', ') || 'Upload failed.';
                setAlertMsg({ type: 'error', msg });
            }
        } catch (err) {
            const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat().join(', ') || 'Network error.';
            setAlertMsg({ type: 'error', msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                animate={{ width: sidebarOpen ? 220 : 60 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="fixed left-0 top-0 bottom-0 bg-slate-900 flex flex-col z-50 overflow-hidden"
            >
                <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-white/8 min-h-[54px] flex-shrink-0">
                    <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <Hospital className="w-4 h-4 text-white" />
                    </div>
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 overflow-hidden">
                                <span className="text-[13px] font-700 text-white whitespace-nowrap">Hospital MIS</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-600">v2.0</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={() => setSidebarOpen(p => !p)} className={cn('w-6 h-6 rounded-md bg-white/7 border-0 cursor-pointer text-white/50 hover:text-white flex items-center justify-center transition-colors flex-shrink-0', sidebarOpen ? 'ml-auto' : 'mx-auto')}>
                        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.22 }}>
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </motion.div>
                    </button>
                </div>
                <nav className="flex-1 py-2 px-2 overflow-hidden">
                    <a href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/55 hover:bg-white/7 hover:text-white transition-all mb-0.5 text-[13px] font-500 no-underline whitespace-nowrap">
                        <LayoutDashboard className="w-4.5 h-4.5 flex-shrink-0" />
                        {sidebarOpen && <span>Dashboard</span>}
                    </a>
                    <a href="/upload" className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-700/35 text-blue-300 transition-all mb-0.5 text-[13px] font-500 no-underline whitespace-nowrap">
                        <UploadIcon className="w-4.5 h-4.5 flex-shrink-0 text-blue-400" />
                        {sidebarOpen && <span>Upload Data</span>}
                    </a>
                    <button onClick={logout} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-300/70 hover:bg-red-500/10 hover:text-red-300 transition-all text-[13px] font-500 w-full border-0 bg-transparent cursor-pointer text-left whitespace-nowrap">
                        <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>
                </nav>
                <div className="px-3 py-2.5 border-t border-white/8 flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-[11px] font-700 flex-shrink-0">{initial}</div>
                    {sidebarOpen && (
                        <div className="min-w-0 overflow-hidden">
                            <div className="text-[12px] font-600 text-white/80 truncate">{name}</div>
                            <div className="text-[10px] text-white/35 capitalize">{user?.role || 'viewer'}</div>
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* Main */}
            <motion.div animate={{ marginLeft: sidebarOpen ? 220 : 60 }} transition={{ duration: 0.22, ease: 'easeInOut' }} className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-[54px] bg-white border-b border-slate-200 shadow-sm flex items-center gap-3 px-5 flex-shrink-0">
                    <UploadIcon className="w-4.5 h-4.5 text-blue-600" />
                    <span className="text-[15px] font-700 text-slate-900">Upload MIS Data</span>
                    <div className="ml-auto flex gap-2">
                        <a href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 border-[1.5px] border-slate-200 rounded-lg text-[12px] font-600 text-slate-600 hover:border-blue-400 hover:text-blue-700 bg-white no-underline transition-all">
                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                        </a>
                        <button onClick={logout} className="inline-flex items-center gap-1.5 px-3 py-1.5 border-[1.5px] border-slate-200 rounded-lg text-[12px] font-600 text-slate-600 hover:border-red-400 hover:text-red-600 bg-white cursor-pointer transition-all">
                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                    </div>
                </header>

                {/* Alert */}
                <AnimatePresence>
                    {alertMsg && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className={cn('flex items-center gap-2 px-5 py-2 text-[13px] font-500 border-b-2 flex-shrink-0',
                                alertMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                            {alertMsg.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {alertMsg.msg}
                            <button onClick={() => setAlertMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100 border-0 bg-transparent cursor-pointer text-lg leading-none">&times;</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Branch strip */}
                <div className="flex items-center gap-3 px-5 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                    <span className="text-[11px] font-600 text-slate-500 uppercase tracking-wide">Branch:</span>
                    {Object.entries(BRANCHES).map(([key, { label, beds: b }]) => (
                        <button key={key} onClick={() => selectBranchLocal(key)}
                            className={cn('flex items-center gap-2 px-4 py-1.5 border-2 rounded-full text-[13px] font-600 transition-all cursor-pointer',
                                branch === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300')}>
                            <BedDouble className="w-3.5 h-3.5" />
                            {label} <span className="text-[11px] font-500 text-slate-400">{b} beds</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden">
                    <form id="uploadForm" onSubmit={onSubmit} className="h-full">
                        <div className="grid grid-cols-[1fr_300px] h-full overflow-hidden">

                            {/* Left — Files */}
                            <div className="overflow-y-auto p-4 space-y-3">

                                {/* Date */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Report Date</span>
                                    </div>
                                    <div className="p-3.5">
                                        <input type="date" value={date} max={today()} onChange={e => setDateLocal(e.target.value)} required
                                            className="w-full px-3 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-[13px] font-500 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                                    </div>
                                </div>

                                {/* Core files */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <Package className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Core Files</span>
                                    </div>
                                    <div className="p-3.5 grid grid-cols-2 gap-2.5">
                                        {FILE_DEFS.filter(f => f.required === true || f.required === 'chromepet').map(f => (
                                            <FileZone key={f.name} {...f} branch={branch} file={files[f.name]} onChange={onFile} />
                                        ))}
                                    </div>
                                </div>

                                {/* Optional files */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Additional Files</span>
                                        <span className="text-[10px] text-slate-400 font-500">— Optional</span>
                                    </div>
                                    <div className="p-3.5 grid grid-cols-3 gap-2.5">
                                        {FILE_DEFS.filter(f => !f.required).map(f => (
                                            <FileZone key={f.name} {...f} branch={branch} file={files[f.name]} onChange={onFile} />
                                        ))}
                                    </div>
                                </div>

                                {/* Result card */}
                                <AnimatePresence>
                                    {result && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-white border border-emerald-200 rounded-xl shadow-md overflow-hidden">
                                            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border-b border-emerald-100">
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                <span className="text-[11px] font-700 uppercase tracking-wider text-emerald-700">Import Summary</span>
                                                <span className="ml-auto text-[11px] text-blue-600 font-600">Redirecting…</span>
                                            </div>
                                            <div className="p-3.5 grid grid-cols-3 gap-2">
                                                {[
                                                    ['Bill Items', result.imported?.bill_items],
                                                    ['Collections', result.imported?.cashier_collections],
                                                    branch === 'chromepet' && ['Packages', result.imported?.package_consumptions],
                                                    result.imported?.er_admissions > 0 && ['ER Adm', result.imported?.er_admissions],
                                                    result.imported?.ip_admissions > 0 && ['IP Adm', result.imported?.ip_admissions],
                                                    result.imported?.surgeries > 0 && ['Surgeries', result.imported?.surgeries],
                                                ].filter(Boolean).map(([label, val]) => (
                                                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-700 mb-0.5">{label}</div>
                                                        <div className="text-[15px] font-800 text-blue-700">{(val || 0).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 px-3.5 pb-3.5">
                                                <a href={misApi.exportExcel(branch, date)} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[12px] font-600 hover:bg-emerald-700 hover:text-white no-underline transition-all">
                                                    <FileText className="w-3.5 h-3.5" /> Excel
                                                </a>
                                                <a href={misApi.exportPdf(branch, date)} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[12px] font-600 hover:bg-red-700 hover:text-white no-underline transition-all">
                                                    <FileText className="w-3.5 h-3.5" /> PDF
                                                </a>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right — Metrics + Submit */}
                            <div className="overflow-y-auto p-4 border-l border-slate-200 bg-slate-50 space-y-3">

                                {/* Occupancy */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Bed Occupancy</span>
                                    </div>
                                    <div className="p-3.5 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-600 text-slate-600 mb-1">Beds Occupied</label>
                                            <input type="number" min="0" placeholder={`of ${beds}`} value={occupancy} onChange={e => setOccupancy(e.target.value)}
                                                className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                                            <p className="text-[10px] text-slate-400 mt-0.5">of {beds} beds</p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-600 text-slate-600 mb-1">Occupancy %</label>
                                            <div className="text-[1.4rem] font-800 text-emerald-600 leading-none py-2">{occPct ? `${occPct}%` : '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Volume */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Volume (FTD)</span>
                                    </div>
                                    <div className="p-3.5 space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[11px] font-600 text-slate-600 mb-1">
                                                    Admission {files.ip_file && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 font-600">Auto</span>}
                                                </label>
                                                <input type="number" min="0" placeholder={files.ip_file ? 'Auto' : '0'} value={admission} onChange={e => setAdmission(e.target.value)}
                                                    className={cn('w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100', files.ip_file && 'bg-emerald-50/50')} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-600 text-slate-600 mb-1">
                                                    Discharge {files.ip_file && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 font-600">Auto</span>}
                                                </label>
                                                <input type="number" min="0" placeholder={files.ip_file ? 'Auto' : '0'} value={discharge} onChange={e => setDischarge(e.target.value)}
                                                    className={cn('w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100', files.ip_file && 'bg-emerald-50/50')} />
                                            </div>
                                        </div>
                                        {branch === 'oragadam' && (
                                            <div>
                                                <label className="block text-[11px] font-600 text-slate-600 mb-1">
                                                    ER Count <span className="text-red-500">*</span>
                                                    {files.er_file && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 font-600">Auto</span>}
                                                </label>
                                                <input type="number" min="0" placeholder={files.er_file ? 'Auto' : '0'} value={erCount} onChange={e => setErCount(e.target.value)}
                                                    className={cn('w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100', files.er_file && 'bg-emerald-50/50')} />
                                            </div>
                                        )}
                                        {(files.ip_file || files.er_file) && (
                                            <div className="space-y-1.5 mt-1">
                                                {files.ip_file && <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"><Hotel className="w-3 h-3 text-blue-500" />Adm/Disc derived from IP file</div>}
                                                {files.er_file && <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"><AlertTriangle className="w-3 h-3 text-blue-500" />ER count derived from ER file</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
                                        <UploadIcon className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Generate Report</span>
                                    </div>
                                    <div className="p-3.5 space-y-2">
                                        <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-700 to-violet-600 text-white rounded-lg text-[14px] font-700 shadow-md hover:opacity-92 transition-all cursor-pointer disabled:opacity-60 border-0">
                                            {loading ? (
                                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                                            ) : (
                                                <><UploadIcon className="w-4 h-4" />Upload &amp; Generate MIS</>
                                            )}
                                        </motion.button>
                                        <button type="button" onClick={reset}
                                            className="w-full py-2 bg-white border-[1.5px] border-slate-200 text-slate-500 rounded-lg text-[13px] font-600 hover:border-red-400 hover:text-red-600 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                                            <RotateCcw className="w-3.5 h-3.5" />Reset Form
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
