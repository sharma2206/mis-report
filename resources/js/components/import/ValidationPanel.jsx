import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { detectFile, FILE_FIELD_MAP, REQUIRED_FIELDS } from '../../utils/fileDetect';

const FIELD_LABELS = {
    bill_file:    'Bill Item Report',
    cashier_file: 'Cashier Collection',
    package_file: 'Package Consumption',
};

export const ValidationPanel = ({ items, branch }) => {
    const required     = REQUIRED_FIELDS[branch] || [];
    const mappedFields = items.map(f => FILE_FIELD_MAP[detectFile(f.name).typeKey]).filter(Boolean);
    const missing      = required.filter(r => !mappedFields.includes(r));
    const allErrors    = items.flatMap(f => (f.issues || []).map(i => ({ ...i, file: f.name })));
    const errors       = allErrors.filter(i => i.type === 'error');
    const warnings     = allErrors.filter(i => i.type === 'warning');
    const readyCount   = items.filter(f => ['ready', 'done'].includes(f.status)).length;

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span className="text-[12px] font-700 text-slate-700">Validation</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Files Queued', value: items.length,    color: 'text-slate-700' },
                        { label: 'Ready',        value: readyCount,      color: 'text-green-700' },
                        { label: 'Errors',       value: errors.length,   color: 'text-red-600'   },
                        { label: 'Warnings',     value: warnings.length, color: 'text-amber-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <div className="text-[9px] font-700 text-slate-400 uppercase tracking-wider">{label}</div>
                            <div className={`text-[22px] font-800 mt-0.5 ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>

                {missing.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                        <div className="text-[10px] font-700 text-amber-700 uppercase tracking-wider mb-1">Required files missing</div>
                        {missing.map(f => (
                            <div key={f} className="flex items-center gap-2 text-[11px] text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                {FIELD_LABELS[f] || f}
                            </div>
                        ))}
                    </div>
                )}

                {missing.length === 0 && items.length > 0 && errors.length === 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        All required files present — ready to import
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="space-y-1.5">
                        {errors.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{e.message}</span>
                            </div>
                        ))}
                        {errors.length > 5 && (
                            <div className="text-[10px] text-red-500 text-center">{errors.length - 5} more errors</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
