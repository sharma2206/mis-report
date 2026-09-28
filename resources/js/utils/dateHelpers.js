export const today = () => new Date().toISOString().split('T')[0];

export const monthStart = (date) => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

export const shiftDate = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

// Return Monday of the week containing dateStr
export const weekStart = (dateStr) => {
    const d   = new Date(dateStr);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
};

// Return Sunday of the week containing dateStr
export const weekEnd = (dateStr) => {
    const d = new Date(weekStart(dateStr));
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
};

export const monthEnd = (dateStr) => {
    const [y, m] = dateStr.split('-').map(Number);
    return new Date(y, m, 0).toISOString().split('T')[0];
};

export const lastMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
};

export const lastMonthEnd = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
};

/**
 * Given a preset key, returns { from, to, label } for that period.
 * 'from' and 'to' are both YYYY-MM-DD strings.
 */
export const resolvePresetRange = (preset) => {
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const todayStr = fmt(now);

    switch (preset) {
        case 'today':
            return { from: todayStr, to: todayStr, label: 'Today' };
        case 'yesterday': {
            const d = new Date(now); d.setDate(d.getDate() - 1);
            const s = fmt(d);
            return { from: s, to: s, label: 'Yesterday' };
        }
        case 'week':
            return { from: weekStart(todayStr), to: todayStr, label: 'This Week' };
        case 'mtd':
            return { from: monthStart(todayStr), to: todayStr, label: 'MTD' };
        case 'last_month':
            return { from: lastMonthStart(), to: lastMonthEnd(), label: 'Last Month' };
        default:
            return { from: todayStr, to: todayStr, label: 'Today' };
    }
};

/** Legacy single-date resolver (used by old Topbar shift logic) */
export const resolvePreset = (preset) => resolvePresetRange(preset).to;

export const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateRange = (from, to) => {
    if (!from) return '';
    if (from === to) return formatDisplayDate(from);
    return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
};
