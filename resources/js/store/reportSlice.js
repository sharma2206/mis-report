import { createSlice } from '@reduxjs/toolkit';
import { today, monthStart, resolvePresetRange } from '../utils/dateHelpers';

const _initRange = (() => {
    try {
        const preset = sessionStorage.getItem('mis_global_preset') || 'mtd';
        const from   = sessionStorage.getItem('mis_global_from');
        const to     = sessionStorage.getItem('mis_global_to');
        // For dynamic presets (today/mtd/week) recompute so the range stays current across days.
        // For custom ranges (no preset key) restore the exact saved from/to.
        if (preset && preset !== 'custom') return resolvePresetRange(preset);
        if (from && to) return { from, to, preset: '' };
    } catch {}
    return resolvePresetRange('mtd');
})();

const reportSlice = createSlice({
    name: 'report',
    initialState: {
        branch:        sessionStorage.getItem('mis_last_branch') || 'chromepet',
        date:          sessionStorage.getItem('mis_last_date')   || today(),
        activeTab:     'overview',
        sidebarOpen:   true,
        mobileMenuOpen: false,

        // Report Period Selector
        periodMode:    'auto',           // 'auto' | 'preset' | 'custom'
        periodPreset:  'today',          // 'today'|'yesterday'|'week'|'mtd'|'last_month'
        periodFrom:    null,             // YYYY-MM-DD, used in custom mode
        periodTo:      null,             // YYYY-MM-DD, used in custom mode

        // Last Import Info
        lastImportInfo: (() => { try { const v = localStorage.getItem('mis_last_import'); return v ? JSON.parse(v) : null; } catch { return null; } })(),

        // Global date filter — shared across all report pages.
        // Restored from sessionStorage on load; dynamic presets (today/mtd) are re-resolved
        // so the range stays accurate across midnight boundaries.
        globalPreset: _initRange.preset ?? sessionStorage.getItem('mis_global_preset') ?? 'mtd',
        globalFrom:   _initRange.from,
        globalTo:     _initRange.to,

        // Smart Alerts
        alerts: [],                      // [{ id, type, title, message, dismissible }]
    },
    reducers: {
        setBranch(state, { payload }) {
            state.branch = payload;
            sessionStorage.setItem('mis_last_branch', payload);
        },
        setDate(state, { payload }) {
            state.date = payload;
            sessionStorage.setItem('mis_last_date', payload);
        },
        setActiveTab(state, { payload }) {
            state.activeTab = payload;
        },
        toggleSidebar(state) {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen(state, { payload }) {
            state.sidebarOpen = payload;
        },
        setMobileMenuOpen(state, { payload }) {
            state.mobileMenuOpen = payload;
        },

        // Period Selector
        setPeriodMode(state, { payload }) {
            state.periodMode = payload;
        },
        setPeriodPreset(state, { payload }) {
            state.periodPreset = payload;
            state.periodMode = 'preset';
        },
        setPeriodRange(state, { payload: { from, to } }) {
            state.periodFrom = from;
            state.periodTo   = to;
            state.periodMode = 'custom';
        },

        // Global date filter
        setGlobalPreset(state, { payload: key }) {
            const r = resolvePresetRange(key);
            state.globalPreset = key;
            state.globalFrom   = r.from;
            state.globalTo     = r.to;
            // Keep selectDate in sync so exports/print still reference the correct date.
            state.date = r.to;
            try {
                sessionStorage.setItem('mis_global_preset', key);
                sessionStorage.setItem('mis_global_from',   r.from);
                sessionStorage.setItem('mis_global_to',     r.to);
                sessionStorage.setItem('mis_last_date',     r.to);
            } catch {}
        },
        setGlobalRange(state, { payload: { from, to } }) {
            state.globalPreset = 'custom';
            state.globalFrom   = from;
            state.globalTo     = to;
            state.date         = to;
            try {
                sessionStorage.setItem('mis_global_preset', 'custom');
                sessionStorage.setItem('mis_global_from',   from);
                sessionStorage.setItem('mis_global_to',     to);
                sessionStorage.setItem('mis_last_date',     to);
            } catch {}
        },

        // Last Import
        setLastImportInfo(state, { payload }) {
            state.lastImportInfo = payload;
            try { localStorage.setItem('mis_last_import', JSON.stringify(payload)); } catch {}
        },

        // Smart Alerts
        addAlert(state, { payload }) {
            const id = payload.id || `alert-${Date.now()}`;
            const exists = state.alerts.find(a => a.id === id);
            if (!exists) {
                state.alerts.push({ ...payload, id });
            }
        },
        dismissAlert(state, { payload: id }) {
            state.alerts = state.alerts.filter(a => a.id !== id);
        },
        clearAlerts(state) {
            state.alerts = [];
        },
        setAlerts(state, { payload }) {
            state.alerts = payload;
        },
    },
});

export const {
    setBranch, setDate, setActiveTab, toggleSidebar, setSidebarOpen, setMobileMenuOpen,
    setPeriodMode, setPeriodPreset, setPeriodRange,
    setGlobalPreset, setGlobalRange,
    setLastImportInfo,
    addAlert, dismissAlert, clearAlerts, setAlerts,
} = reportSlice.actions;

export const selectBranch         = (s) => s.report.branch;
export const selectDate           = (s) => s.report.date;
export const selectActiveTab      = (s) => s.report.activeTab;
export const selectSidebarOpen    = (s) => s.report.sidebarOpen;
export const selectMobileMenuOpen = (s) => s.report.mobileMenuOpen;
export const selectPeriodMode     = (s) => s.report.periodMode;
export const selectPeriodPreset   = (s) => s.report.periodPreset;
export const selectPeriodFrom     = (s) => s.report.periodFrom;
export const selectPeriodTo       = (s) => s.report.periodTo;
export const selectLastImportInfo = (s) => s.report.lastImportInfo;
export const selectAlerts         = (s) => s.report.alerts;
export const selectGlobalPreset   = (s) => s.report.globalPreset;
export const selectGlobalFrom     = (s) => s.report.globalFrom;
export const selectGlobalTo       = (s) => s.report.globalTo;

// Derived: the period start to use when auto mode is active.
// Falls back to the import date itself if periodFrom was never stored
// (backward-compatible with older lastImportInfo shapes).
export const selectAutoFrom = (s) => {
    const info = s.report.lastImportInfo;
    return info?.periodFrom ?? info?.date ?? null;
};
export const selectAutoTo = (s) => {
    const info = s.report.lastImportInfo;
    return info?.periodTo ?? info?.date ?? null;
};

export default reportSlice.reducer;
