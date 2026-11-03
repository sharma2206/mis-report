import { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays, ChevronDown, Check, SlidersHorizontal, X,
    CheckCircle2, ListFilter
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { today, resolvePresetRange } from '../../utils/dateHelpers';
import {
    selectGlobalFrom, selectGlobalTo,
    selectGfDepartments, selectGfDoctors, selectGfPatientTypes, selectGfGenders,
    selectGfAgeGroups, selectGfPaymentTypes, selectGfSpecialties,
    selectGfWards, selectGfCorporate, selectGfInsurance, selectGfPayers,
    selectGfServiceCategories, selectGfReferralSource,
    selectGfFiltersOpen, toggleGfFiltersOpen, resetAdvancedFilters,
    selectBranch, setDraftFilters, applyDraftFilters, selectDraftFilters
} from '../../store/reportSlice';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { useBranches } from '../../hooks/useBranches';
import { analyticsApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';

const DATE_PRESETS = [
    { key: 'today',      label: 'Today'      },
    { key: 'yesterday',  label: 'Yesterday'  },
    { key: 'week',       label: 'Last 7 Days'},
    { key: 'month',      label: 'Last 30 Days'},
    { key: 'mtd',        label: 'MTD'        },
    { key: 'ytd',        label: 'YTD'        },
];

const PATIENT_TYPES  = ['OP', 'IP', 'Emergency', 'Day Care'];
const GENDERS        = ['Male', 'Female', 'Other'];
const AGE_GROUPS     = ['0-18', '19-40', '41-60', '61+'];
const PAYMENT_TYPES  = ['Cash', 'UPI', 'Card', 'Insurance', 'Corporate', 'TPA'];

const useFilterOptions = (branches) => {
    const branch = Array.isArray(branches) ? branches.join(',') : branches;
    const { data, isLoading } = useQuery({
        queryKey: ['analytics-filter-options', branch],
        queryFn: () => analyticsApi.filterOptions({ branch }).then(r => r.data),
        enabled: !!branch,
        staleTime: 1000 * 60 * 15,
    });

    return {
        options: data?.success ? data.data : {},
        isLoading,
    };
};

function fmtDisplay(from, to) {
    if (!from) return 'Select date';
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    const f = new Date(from + 'T00:00:00').toLocaleDateString('en-IN', opts);
    const t = to ? new Date(to + 'T00:00:00').toLocaleDateString('en-IN', opts) : f;
    return from === to ? f : `${f} - ${t}`;
}

export const GlobalFilterBar = () => {
    const dispatch = useDispatch();
    const { branches } = useBranches();
    const branchOptions = branches.map(b => ({ label: b.name, value: b.key }));
    
    // Active Redux State
    const activeState = {
        branch:         useSelector(selectBranch),
        dateRange:      { from: useSelector(selectGlobalFrom), to: useSelector(selectGlobalTo) },
        gfDepartments:  useSelector(selectGfDepartments),
        gfDoctors:      useSelector(selectGfDoctors),
        gfPatientTypes: useSelector(selectGfPatientTypes),
        gfGenders:      useSelector(selectGfGenders),
        gfAgeGroups:    useSelector(selectGfAgeGroups),
        gfPaymentTypes: useSelector(selectGfPaymentTypes),
        gfSpecialties:  useSelector(selectGfSpecialties),
        gfWards:        useSelector(selectGfWards),
        gfCorporate:    useSelector(selectGfCorporate),
        gfInsurance:    useSelector(selectGfInsurance),
        gfPayers:       useSelector(selectGfPayers),
        gfServiceCategories: useSelector(selectGfServiceCategories),
        gfReferralSource: useSelector(selectGfReferralSource),
    };
    const advOpen = useSelector(selectGfFiltersOpen);
    const draftFilters = useSelector(selectDraftFilters);

    // Current state (Draft if exists, else Active)
    const current = draftFilters || activeState;

    const setDraft = (key, val) => {
        dispatch(setDraftFilters({ ...current, [key]: val }));
    };

    const handleApply = () => dispatch(applyDraftFilters());
    const handleClear = () => {
        dispatch(resetAdvancedFilters());
        dispatch(setDraftFilters(null));
        // Reset to default branch/date if desired, or just clear advanced.
    };

    const { options: dynOptions, isLoading: optionsLoading } = useFilterOptions(current.branch);

    // Date Picker state (Local to date dropdown)
    const [dateOpen, setDateOpen] = useState(false);
    const dateRef = useRef(null);

    useEffect(() => {
        if (!dateOpen) return;
        const h = (e) => { if (!dateRef.current?.contains(e.target)) setDateOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [dateOpen]);

    const activeAdvCount = [
        ...current.gfDepartments, ...current.gfPatientTypes, ...current.gfGenders,
        ...current.gfAgeGroups, ...current.gfPaymentTypes, ...current.gfSpecialties,
        ...current.gfWards, ...current.gfCorporate, ...current.gfInsurance,
        ...current.gfPayers, ...current.gfServiceCategories, ...current.gfReferralSource
    ].length;

    return (
        <div className="sticky top-[52px] z-30 bg-white border-b border-slate-200 transition-all">
            {/* ROW 1 - Primary Filters */}
            <div className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                <MultiSelectDropdown
                    label="Branch"
                    options={branchOptions}
                    selected={current.branch}
                    onChange={v => setDraft('branch', v)}
                    defaultLabel="All Branches"
                    searchable
                    className="w-48"
                />
                
                <MultiSelectDropdown
                    label="Department"
                    options={dynOptions.departments || []}
                    selected={current.gfDepartments}
                    onChange={v => setDraft('gfDepartments', v)}
                    defaultLabel="All Depts"
                    searchable
                    className="w-40"
                />

                <MultiSelectDropdown
                    label="Specialty"
                    options={dynOptions.specialties || []}
                    selected={current.gfSpecialties}
                    onChange={v => setDraft('gfSpecialties', v)}
                    defaultLabel="All Specialties"
                    searchable
                    className="w-44"
                />

                <MultiSelectDropdown
                    label="Doctor"
                    options={dynOptions.doctors || []}
                    selected={current.gfDoctors || []}
                    onChange={v => setDraft('gfDoctors', v)}
                    defaultLabel="All Doctors"
                    searchable
                    className="w-40"
                />

                <MultiSelectDropdown
                    label="Patient Type"
                    options={PATIENT_TYPES}
                    selected={current.gfPatientTypes}
                    onChange={v => setDraft('gfPatientTypes', v)}
                    defaultLabel="All Types"
                    className="w-36"
                />

                {/* Date Filter */}
                <div className="relative ml-auto" ref={dateRef}>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-700 uppercase tracking-wider text-slate-500 ml-0.5">Date Range</label>
                        <button
                            onClick={() => setDateOpen(!dateOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] font-600 transition-all cursor-pointer",
                                dateOpen ? "border-blue-400 ring-2 ring-blue-500/15" : "hover:border-slate-300"
                            )}
                        >
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">{fmtDisplay(current.dateRange.from, current.dateRange.to)}</span>
                            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform ml-2", dateOpen && "rotate-180")} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {dateOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                                className="absolute right-0 top-[calc(100%+4px)] z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-80"
                            >
                                <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Quick Select</p>
                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                    {DATE_PRESETS.map(p => (
                                        <button key={p.key}
                                            onClick={() => {
                                                const r = resolvePresetRange(p.key);
                                                setDraft('dateRange', { from: r.from, to: r.to });
                                                setDateOpen(false);
                                            }}
                                            className="px-2 py-1.5 rounded-lg text-[11px] font-600 bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700 transition-colors"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-[10px] font-700 uppercase tracking-wider text-slate-400 mb-2">Custom Range</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <input type="date" value={current.dateRange.from || ''} max={current.dateRange.to || today()}
                                                onChange={e => setDraft('dateRange', { ...current.dateRange, from: e.target.value })}
                                                className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                        </div>
                                        <div>
                                            <input type="date" value={current.dateRange.to || ''} min={current.dateRange.from} max={today()}
                                                onChange={e => setDraft('dateRange', { ...current.dateRange, to: e.target.value })}
                                                className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                        </div>
                                    </div>
                                    <button onClick={() => setDateOpen(false)} className="mt-3 w-full py-1.5 bg-slate-800 text-white rounded-lg text-[12px] font-600 hover:bg-slate-700">
                                        Set Date
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ROW 2 - Advanced Filters Toggle & Action Buttons */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => dispatch(toggleGfFiltersOpen())}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-600 transition-colors border",
                            advOpen || activeAdvCount > 0 ? "bg-white border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                    >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>More Filters</span>
                        {activeAdvCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">{activeAdvCount}</span>}
                        <ChevronDown className={cn("w-3 h-3 transition-transform ml-1", advOpen && "rotate-180")} />
                    </button>
                    
                    {optionsLoading && <span className="text-[11px] text-slate-400">Loading filter options…</span>}
                </div>

                <div className="flex items-center gap-2">
                    {draftFilters && (
                        <>
                            <span className="text-[11px] font-500 text-amber-600 flex items-center gap-1 mr-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Unapplied Changes
                            </span>
                            <button onClick={handleClear} className="px-3 py-1.5 rounded-lg text-[12px] font-600 text-slate-600 hover:bg-slate-100 transition-colors">
                                Reset
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleApply}
                        disabled={!draftFilters}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-600 transition-all",
                            draftFilters 
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Apply Filters
                    </button>
                </div>
            </div>

            {/* COLLAPSIBLE - Advanced Filters */}
            <AnimatePresence>
                {advOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
                    >
                        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <MultiSelectDropdown label="Payment Type" options={PAYMENT_TYPES} selected={current.gfPaymentTypes} onChange={v => setDraft('gfPaymentTypes', v)} defaultLabel="All Payments" />
                            <MultiSelectDropdown label="Payer" options={dynOptions.payers || []} selected={current.gfPayers} onChange={v => setDraft('gfPayers', v)} defaultLabel="All Payers" searchable />
                            <MultiSelectDropdown label="Insurance" options={dynOptions.insurance || []} selected={current.gfInsurance} onChange={v => setDraft('gfInsurance', v)} defaultLabel="All Insurance" searchable />
                            <MultiSelectDropdown label="Corporate" options={dynOptions.corporate || []} selected={current.gfCorporate} onChange={v => setDraft('gfCorporate', v)} defaultLabel="All Corporate" searchable />
                            <MultiSelectDropdown label="Ward" options={dynOptions.wards || []} selected={current.gfWards} onChange={v => setDraft('gfWards', v)} defaultLabel="All Wards" searchable />
                            <MultiSelectDropdown label="Service Category" options={dynOptions.service_categories || []} selected={current.gfServiceCategories} onChange={v => setDraft('gfServiceCategories', v)} defaultLabel="All Services" searchable />
                            <MultiSelectDropdown label="Gender" options={GENDERS} selected={current.gfGenders} onChange={v => setDraft('gfGenders', v)} defaultLabel="All Genders" />
                            <MultiSelectDropdown label="Age Group" options={AGE_GROUPS} selected={current.gfAgeGroups} onChange={v => setDraft('gfAgeGroups', v)} defaultLabel="All Ages" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
