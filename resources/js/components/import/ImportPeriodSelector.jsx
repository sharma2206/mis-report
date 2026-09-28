import { motion, AnimatePresence } from 'framer-motion';
import {
    ScanLine, Calendar, RefreshCw, CheckCircle2, AlertTriangle,
    XCircle, ArrowRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { fmtDMY, parseKareDate } from '../../utils/csvScanner';
import { today } from '../../utils/dateHelpers';

// Props accepted (both old and new naming supported for backwards-compat):
//   mode | periodMode         — 'auto' | 'manual'
//   onModeChange | setPeriodMode  — (mode) => void
//   onForceManual               — () => void   (optional shortcut to force manual)
//   manualFrom, onManualFrom | setManualFrom
//   manualTo,   onManualTo   | setManualTo
//   period                      — { status, min, max, sources, scanCount }
//   stepNumber                  — optional int for numbered step label
export const ImportPeriodSelector = ({
    period,
    // Support both naming conventions
    mode, periodMode,
    onModeChange, setPeriodMode,
    manualFrom, manualTo,
    onManualFrom, setManualFrom,
    onManualTo, setManualTo,
    onForceManual,
    stepNumber,
}) => {
    // Resolve props regardless of which naming convention is used
    const activeMode      = mode ?? periodMode ?? 'auto';
    const handleModeChange = onModeChange ?? setPeriodMode ?? (() => {});
    const handleManualFrom = onManualFrom ?? setManualFrom ?? (() => {});
    const handleManualTo   = onManualTo   ?? setManualTo   ?? (() => {});
    const handleForceManual = onForceManual ?? (() => handleModeChange('manual'));

    const isAuto = activeMode === 'auto';

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {stepNumber != null && (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-700 flex items-center justify-center flex-shrink-0">
                            {stepNumber}
                        </span>
                    )}
                    <ScanLine className="w-4 h-4 text-slate-400" />
                    <span className="text-[12px] font-700 text-slate-700">Report Date</span>
                </div>
                <button
                    onClick={() => handleModeChange(isAuto ? 'manual' : 'auto')}
                    className="flex items-center gap-1.5 text-[11px] font-600 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                    {isAuto
                        ? <><ToggleLeft className="w-4 h-4" /> Auto Detect</>
                        : <><ToggleRight className="w-4 h-4 text-blue-600" /> Manual Range</>
                    }
                </button>
            </div>

            <div className="p-4">
                <AnimatePresence mode="wait">
                    {isAuto ? (
                        <motion.div key="auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {period.status === 'idle' && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-600 text-slate-500">Auto Detect</div>
                                        <div className="text-[11px] text-slate-400">Upload CSV files to detect the report period</div>
                                    </div>
                                </div>
                            )}

                            {period.status === 'scanning' && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-600 text-blue-700">Scanning date columns…</div>
                                        <div className="text-[11px] text-slate-400">
                                            Reading {period.scanCount || 0} file{period.scanCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {period.status === 'single' && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-0.5">Detected Report Date</div>
                                        <div className="text-[14px] font-700 text-slate-800">{fmtDMY(period.min)}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">From {period.sources?.join(', ')}</div>
                                    </div>
                                </div>
                            )}

                            {period.status === 'range' && (
                                <div>
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-0.5">Detected Report Period</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-700 text-slate-800">{fmtDMY(period.min)}</span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[13px] font-700 text-slate-800">{fmtDMY(period.max)}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                Across {period.sources?.length} file{period.sources?.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-[11px] font-700 text-amber-800">Files span multiple days</div>
                                            <div className="text-[10px] text-amber-700 mt-0.5">
                                                Verify this is expected, or switch to Manual Range to set a specific period.
                                            </div>
                                        </div>
                                        <button onClick={handleForceManual}
                                            className="text-[10px] font-700 text-amber-700 hover:text-amber-900 whitespace-nowrap cursor-pointer">
                                            Set Manually
                                        </button>
                                    </div>
                                </div>
                            )}

                            {period.status === 'inconsistent' && (
                                <div>
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[12px] font-700 text-amber-800">Inconsistent date ranges across files</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Overall: {fmtDMY(period.min)} → {fmtDMY(period.max)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                                        <button
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-600 text-slate-600 hover:border-slate-300 bg-white cursor-pointer"
                                            onClick={() => {/* continue with detected range */}}>
                                            Continue Anyway
                                        </button>
                                        <button
                                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-700 hover:bg-amber-700 cursor-pointer"
                                            onClick={handleForceManual}>
                                            Set Manually
                                        </button>
                                    </div>
                                </div>
                            )}

                            {period.status === 'no_dates' && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] font-700 text-red-700">No date columns found</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">Please select the report period manually.</div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            {[
                                { label: 'From Date', val: manualFrom, onChange: handleManualFrom, min: undefined, max: manualTo || today() },
                                { label: 'To Date',   val: manualTo,   onChange: handleManualTo,   min: manualFrom, max: today()           },
                            ].map(({ label, val, onChange, min, max }) => (
                                <div key={label}>
                                    <label className="block text-[10px] font-700 uppercase tracking-wider text-slate-500 mb-1.5">
                                        {label}
                                    </label>
                                    <div className="relative">
                                        <input type="date" value={val} min={min} max={max}
                                            onChange={e => onChange(e.target.value)}
                                            className="w-full pl-3 pr-9 py-2 text-[12px] border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 appearance-none bg-white" />
                                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            ))}
                            {manualFrom && manualTo && (
                                <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    {manualFrom === manualTo
                                        ? `Report Date: ${fmtDMY(parseKareDate(manualTo))}`
                                        : `Period: ${fmtDMY(parseKareDate(manualFrom))} → ${fmtDMY(parseKareDate(manualTo))}`
                                    }
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
