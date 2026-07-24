import { createSlice, createSelector } from '@reduxjs/toolkit';
import { today, resolvePresetRange } from '../utils/dateHelpers';

const _initRange = (() => {
    try {
        const preset = sessionStorage.getItem('mis_global_preset') || 'mtd';
        const from   = sessionStorage.getItem('mis_global_from');
        const to     = sessionStorage.getItem('mis_global_to');
        if (preset && preset !== 'custom') return resolvePresetRange(preset);
        if (from && to) return { from, to, preset: '' };
    } catch {}
    return resolvePresetRange('mtd');
})();

// Dark mode — persisted to localStorage
const _initDark = (() => {
    try { return localStorage.getItem('mis_dark_mode') === 'true'; } catch { return false; }
})();

const reportSlice = createSlice({
    name: 'report',
    initialState: {
        branch:         (() => {
            const b = sessionStorage.getItem('mis_last_branch');
            return b ? b.split(',') : ['chromepet'];
        })(),
        date:           sessionStorage.getItem('mis_last_date')   || today(),
        activeTab:      'overview',
        sidebarOpen:    true,
        mobileMenuOpen: false,

        // Dark mode
        darkMode: _initDark,

        // Report Period Selector
        periodMode:    'auto',
        periodPreset:  'today',
        periodFrom:    null,
        periodTo:      null,

        // Last Import Info
        lastImportInfo: (() => { try { const v = localStorage.getItem('mis_last_import'); return v ? JSON.parse(v) : null; } catch { return null; } })(),

        // Global date filter
        globalPreset: _initRange.preset ?? sessionStorage.getItem('mis_global_preset') ?? 'mtd',
        globalFrom:   _initRange.from,
        globalTo:     _initRange.to,

        // ── Advanced Global Filters ─────────────────────────────────────────
        // These propagate to every analytics API call as query params.
        gfDepartments:  [],   // string[]
        gfDoctors:      [],   // string[]
        gfPatientTypes: [],   // 'OP'|'IP'|'ER'|'Day Care'[]
        gfGenders:      [],   // 'Male'|'Female'|'Other'[]
        gfAgeGroups:    [],   // '0-18'|'19-40'|'41-60'|'61+'[]
        gfPaymentTypes: [],   // 'Cash'|'UPI'|'Insurance'|'Corporate'[]
        gfSpecialties:  [],   // string[]
        gfWards:        [],   // string[]
        gfCorporate:    [],   // string[]
        gfInsurance:    [],   // string[]
        gfReferralSource: [], // string[]
        gfFiltersOpen:  false, // Advanced filter panel collapsed state

        // Draft filters (used before clicking "Apply")
        draftFilters: null,

        // Smart Alerts
        alerts: [],
    },
    reducers: {
        setBranch(state, { payload }) {
            const arr = Array.isArray(payload) ? payload : [payload];
            state.branch = arr;
            sessionStorage.setItem('mis_last_branch', arr.join(','));
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

        // Dark mode
        toggleDarkMode(state) {
            state.darkMode = !state.darkMode;
            try { localStorage.setItem('mis_dark_mode', String(state.darkMode)); } catch {}
        },
        setDarkMode(state, { payload }) {
            state.darkMode = payload;
            try { localStorage.setItem('mis_dark_mode', String(payload)); } catch {}
        },

        // Advanced Global Filters
        setGfDepartments(state,  { payload }) { state.gfDepartments  = payload; },
        setGfDoctors(state,      { payload }) { state.gfDoctors      = payload; },
        setGfPatientTypes(state, { payload }) { state.gfPatientTypes = payload; },
        setGfGenders(state,      { payload }) { state.gfGenders      = payload; },
        setGfAgeGroups(state,    { payload }) { state.gfAgeGroups    = payload; },
        setGfPaymentTypes(state, { payload }) { state.gfPaymentTypes = payload; },
        setGfSpecialties(state,  { payload }) { state.gfSpecialties  = payload; },
        setGfWards(state,        { payload }) { state.gfWards        = payload; },
        setGfCorporate(state,    { payload }) { state.gfCorporate    = payload; },
        setGfInsurance(state,    { payload }) { state.gfInsurance    = payload; },
        setGfReferralSource(state, { payload }) { state.gfReferralSource = payload; },
        toggleGfFiltersOpen(state) { state.gfFiltersOpen = !state.gfFiltersOpen; },
        setDraftFilters(state, { payload }) { state.draftFilters = payload; },
        applyDraftFilters(state) {
            if (!state.draftFilters) return;
            const d = state.draftFilters;
            if (d.branch !== undefined) state.branch = Array.isArray(d.branch) ? d.branch : [d.branch];
            if (d.dateRange) {
                state.globalFrom = d.dateRange.from;
                state.globalTo   = d.dateRange.to;
                state.date       = d.dateRange.to;
            }
            if (d.gfDepartments !== undefined)  state.gfDepartments  = d.gfDepartments;
            if (d.gfDoctors !== undefined)      state.gfDoctors      = d.gfDoctors;
            if (d.gfPatientTypes !== undefined) state.gfPatientTypes = d.gfPatientTypes;
            if (d.gfGenders !== undefined)      state.gfGenders      = d.gfGenders;
            if (d.gfAgeGroups !== undefined)    state.gfAgeGroups    = d.gfAgeGroups;
            if (d.gfPaymentTypes !== undefined) state.gfPaymentTypes = d.gfPaymentTypes;
            if (d.gfSpecialties !== undefined)  state.gfSpecialties  = d.gfSpecialties;
            if (d.gfCorporate !== undefined)    state.gfCorporate    = d.gfCorporate;
            if (d.gfInsurance !== undefined)    state.gfInsurance    = d.gfInsurance;
            if (d.gfReferralSource !== undefined) state.gfReferralSource = d.gfReferralSource;
            state.draftFilters = null;
        },
        resetAdvancedFilters(state) {
            state.gfDepartments  = [];
            state.gfDoctors      = [];
            state.gfPatientTypes = [];
            state.gfGenders      = [];
            state.gfAgeGroups    = [];
            state.gfPaymentTypes = [];
            state.gfSpecialties  = [];
            state.gfWards        = [];
            state.gfCorporate    = [];
            state.gfInsurance    = [];
            state.gfReferralSource = [];
        },
    },
});

export const {
    setBranch, setDate, setActiveTab, toggleSidebar, setSidebarOpen, setMobileMenuOpen,
    setPeriodMode, setPeriodPreset, setPeriodRange,
    setGlobalPreset, setGlobalRange,
    setLastImportInfo,
    addAlert, dismissAlert, clearAlerts, setAlerts,
    toggleDarkMode, setDarkMode,
    setGfDepartments, setGfDoctors, setGfPatientTypes, setGfGenders,
    setGfAgeGroups, setGfPaymentTypes, setGfSpecialties, setGfWards,
    setGfCorporate, setGfInsurance, setGfReferralSource,
    toggleGfFiltersOpen, resetAdvancedFilters,
    setDraftFilters, applyDraftFilters,
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
export const selectDarkMode       = (s) => s.report.darkMode;

// Advanced filter selectors
export const selectGfDepartments  = (s) => s.report.gfDepartments;
export const selectGfDoctors      = (s) => s.report.gfDoctors;
export const selectGfPatientTypes = (s) => s.report.gfPatientTypes;
export const selectGfGenders      = (s) => s.report.gfGenders;
export const selectGfAgeGroups    = (s) => s.report.gfAgeGroups;
export const selectGfPaymentTypes = (s) => s.report.gfPaymentTypes;
export const selectGfSpecialties  = (s) => s.report.gfSpecialties;
export const selectGfWards        = (s) => s.report.gfWards;
export const selectGfCorporate    = (s) => s.report.gfCorporate;
export const selectGfInsurance    = (s) => s.report.gfInsurance;
export const selectGfReferralSource = (s) => s.report.gfReferralSource;
export const selectGfFiltersOpen  = (s) => s.report.gfFiltersOpen;
export const selectDraftFilters   = (s) => s.report.draftFilters;

// Derived: build a params object for analytics API calls
export const selectAdvancedFilterParams = createSelector(
    [
        (s) => s.report.gfDepartments,
        (s) => s.report.gfDoctors,
        (s) => s.report.gfPatientTypes,
        (s) => s.report.gfGenders,
        (s) => s.report.gfAgeGroups,
        (s) => s.report.gfPaymentTypes,
        (s) => s.report.gfSpecialties,
        (s) => s.report.gfWards,
        (s) => s.report.gfCorporate,
        (s) => s.report.gfInsurance,
        (s) => s.report.gfReferralSource
    ],
    (dept, docs, pt, gen, age, pay, spec, wards, corp, ins, ref) => {
        const p = {};
        if (dept?.length)  p['departments[]']  = dept;
        if (docs?.length)  p['doctors[]']      = docs;
        if (pt?.length)    p['patient_types[]']= pt;
        if (gen?.length)   p['genders[]']      = gen;
        if (age?.length)   p['age_groups[]']   = age;
        if (pay?.length)   p['payment_types[]']= pay;
        if (spec?.length)  p['specialties[]']  = spec;
        if (wards?.length) p['wards[]']        = wards;
        if (corp?.length)  p['corporate[]']    = corp;
        if (ins?.length)   p['insurance[]']    = ins;
        if (ref?.length)   p['referral_source[]'] = ref;
        return p;
    }
);

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
