import { motion } from 'framer-motion';
import { CHART_PALETTE } from '../../constants';

export const RankedList = ({ items = [], nameKey, subKey, valueKey, barColor = '#1d4ed8', valueFormat }) => {
    const max = items[0]?.[valueKey] || 1;
    return (
        <div className="space-y-2">
            {items.slice(0, 10).map((item, i) => {
                const pct = ((item[valueKey] / max) * 100).toFixed(0);
                const displayVal = valueFormat ? valueFormat(item[valueKey]) : item[valueKey];
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-800 flex items-center justify-center flex-shrink-0">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-600 text-slate-800 truncate">{item[nameKey]}</div>
                            {subKey && <div className="text-[11px] text-slate-400 truncate">{item[subKey]}</div>}
                            <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: i * 0.04 + 0.1, duration: 0.4 }}
                                    className="h-full rounded-full"
                                    style={{ background: barColor }}
                                />
                            </div>
                        </div>
                        <div className="text-[13px] font-700 text-blue-700 flex-shrink-0">{displayVal}</div>
                    </motion.div>
                );
            })}
            {items.length === 0 && (
                <p className="text-[12px] text-slate-400 py-2">No data available</p>
            )}
        </div>
    );
};

export const PayerChips = ({ items = [], nameKey = 'payer_type', countKey = 'count' }) => (
    <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-[12px] font-600 text-slate-700">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                {item[nameKey]}
                <span className="text-slate-400 font-500 ml-0.5">{item[countKey]}</span>
            </div>
        ))}
    </div>
);
