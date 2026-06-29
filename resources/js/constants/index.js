export const BRANCHES = {
    chromepet: { label: 'Chromepet', beds: 74 },
    oragadam:  { label: 'Oragadam',  beds: 14 },
};

export const BRANCH_LIST = Object.entries(BRANCHES).map(([key, val]) => ({ key, ...val }));

export const PATIENT_TYPES = ['OP', 'IP', 'ER', 'PH'];

export const CHART_PALETTE = [
    '#1d4ed8', '#059669', '#7c3aed', '#d97706',
    '#dc2626', '#0891b2', '#0d9488', '#db2777',
    '#4f46e5', '#9333ea',
];

export const DATE_PRESETS = [
    { key: 'today',      label: 'Today' },
    { key: 'yesterday',  label: 'Yesterday' },
    { key: 'week',       label: 'This Week' },
    { key: 'mtd',        label: 'MTD' },
    { key: 'last_month', label: 'Last Month' },
];

export const NAV_TABS = [
    { key: 'overview',  label: 'Overview',      icon: 'LayoutDashboard' },
    { key: 'revenue',   label: 'Revenue',        icon: 'CreditCard' },
    { key: 'volume',    label: 'Volume & MRI',   icon: 'TrendingUp' },
    { key: 'analytics', label: 'Analytics',      icon: 'BarChart2' },
    { key: 'ip',        label: 'IP',             icon: 'BedDouble' },
    { key: 'surgery',   label: 'Surgery',        icon: 'Stethoscope' },
    { key: 'op',        label: 'OP',             icon: 'UserCheck' },
];
