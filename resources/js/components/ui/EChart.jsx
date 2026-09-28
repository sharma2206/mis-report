import ReactECharts from 'echarts-for-react';

// Shared tooltip formatter factory
export const tooltipRupee = () => ({
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { fontSize: 11, color: '#334155' },
    extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)',
    valueFormatter: (v) => `₹${(v / 100000).toFixed(2)}L`,
});

export const tooltipCount = () => ({
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { fontSize: 11, color: '#334155' },
    extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -4px rgba(0,0,0,.12)',
});

export const axisLabel = (extra = {}) => ({
    fontSize: 10,
    color: '#94a3b8',
    ...extra,
});

export const gridDefault = (extra = {}) => ({
    top: 12, right: 12, bottom: 24, left: 48,
    containLabel: true,
    ...extra,
});

// Thin wrapper — passes everything through to echarts-for-react
// Adds sensible defaults: notMerge=true, lazyUpdate, transparent bg
export default function EChart({ option, height = 220, style, className, onEvents }) {
    const merged = {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 400,
        ...option,
    };
    return (
        <ReactECharts
            option={merged}
            style={{ height, width: '100%', ...style }}
            className={className}
            notMerge
            lazyUpdate
            onEvents={onEvents}
        />
    );
}
