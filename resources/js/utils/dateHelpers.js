export const today = () => new Date().toISOString().split('T')[0];

export const monthStart = (date) => date ? date.substring(0, 8) + '01' : null;

export const shiftDate = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

export const resolvePreset = (preset) => {
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    switch (preset) {
        case 'today':      return fmt(now);
        case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); return fmt(d); }
        case 'week':      { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return fmt(d); }
        case 'mtd':       return fmt(now);
        case 'last_month':{ const d = new Date(now.getFullYear(), now.getMonth(), 0); return fmt(d); }
        default:           return fmt(now);
    }
};

export const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
