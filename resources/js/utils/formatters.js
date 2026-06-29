/** Convert raw rupees to lakhs string: ₹1.23L */
export const fmtL = (v) => `₹${((v || 0) / 100000).toFixed(2)}L`;

/** Lakhs value (number) */
export const toLakhs = (v, decimals = 2) => +((v || 0) / 100000).toFixed(decimals);

/** ₹1,23,456 */
export const fmtRupee = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;

/** Percent string */
export const fmtPct = (v, decimals = 1) => `${Number(v || 0).toFixed(decimals)}%`;

/** Conditional formatting class for table cells */
export const cfClass = (lakhsVal) => {
    const n = Number(lakhsVal) || 0;
    if (n === 0)  return 'text-slate-400';
    if (n >= 5)   return 'text-emerald-600 font-semibold';
    return '';
};

/** Sum object values */
export const sumObj = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
