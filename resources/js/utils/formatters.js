/** Message shown when a KPI's source report was never uploaded (see DashboardKpiService::NA_MESSAGE) */
export const NA_MESSAGE = 'N/A (Source report not uploaded)';

/** Convert raw rupees to lakhs string: ₹1.23L, or N/A when the source report is missing */
export const fmtL = (v) => v === null ? 'N/A' : `₹${((v || 0) / 100000).toFixed(2)}L`;

/** Lakhs value (number) */
export const toLakhs = (v, decimals = 2) => +((v || 0) / 100000).toFixed(decimals);

/** ₹1,23,456, or N/A when the source report is missing */
export const fmtRupee = (v) => v === null ? 'N/A' : `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;

/** Percent string, or N/A when the source report is missing */
export const fmtPct = (v, decimals = 1) => v === null ? 'N/A' : `${Number(v || 0).toFixed(decimals)}%`;

/** Conditional formatting class for table cells */
export const cfClass = (lakhsVal) => {
    const n = Number(lakhsVal) || 0;
    if (n === 0)  return 'text-slate-400';
    if (n >= 5)   return 'text-emerald-600 font-semibold';
    return '';
};

/** Sum object values */
export const sumObj = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
