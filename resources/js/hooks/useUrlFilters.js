import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    setBranch, setGlobalRange,
    setGfDepartments, setGfDoctors, setGfPatientTypes,
    setGfGenders, setGfAgeGroups, setGfPaymentTypes,
    setGfSpecialties, setGfWards,
    setGfCorporate, setGfInsurance, setGfReferralSource,
    selectBranch, selectGlobalFrom, selectGlobalTo,
    selectAdvancedFilterParams
} from '../store/reportSlice';

export function useUrlFilters() {
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch();
    const isInitialized = useRef(false);

    const branch = useSelector(selectBranch);
    const from = useSelector(selectGlobalFrom);
    const to = useSelector(selectGlobalTo);
    const advParams = useSelector(selectAdvancedFilterParams);

    // 1. On Mount: Read URL and update Redux
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const pBranch = searchParams.get('branch');
        if (pBranch) {
            dispatch(setBranch(pBranch.split(',')));
        }

        const pFrom = searchParams.get('from');
        const pTo = searchParams.get('to');
        if (pFrom && pTo) {
            dispatch(setGlobalRange({ from: pFrom, to: pTo }));
        }

        const getArr = (k) => {
            const v = searchParams.get(k);
            return v ? v.split(',') : [];
        };

        dispatch(setGfDepartments(getArr('departments')));
        dispatch(setGfDoctors(getArr('doctors')));
        dispatch(setGfPatientTypes(getArr('patient_types')));
        dispatch(setGfGenders(getArr('genders')));
        dispatch(setGfAgeGroups(getArr('age_groups')));
        dispatch(setGfPaymentTypes(getArr('payment_types')));
        dispatch(setGfSpecialties(getArr('specialties')));
        dispatch(setGfWards(getArr('wards')));
        
        // Ensure these exist in slice
        dispatch(setGfCorporate(getArr('corporate')));
        dispatch(setGfInsurance(getArr('insurance')));
        dispatch(setGfReferralSource(getArr('referral_source')));

    }, [dispatch, searchParams]);

    // 2. On State Change: Update URL
    useEffect(() => {
        if (!isInitialized.current) return;

        const newParams = new URLSearchParams();
        
        if (branch && branch.length > 0) {
            newParams.set('branch', Array.isArray(branch) ? branch.join(',') : branch);
        }
        if (from && to) {
            newParams.set('from', from);
            newParams.set('to', to);
        }

        // Loop over the advanced filter params mapping from Redux
        // advParams returns keys like 'departments[]' or 'doctors[]' but for URL we want 'departments'
        Object.entries(advParams).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length > 0) {
                const cleanKey = key.replace('[]', '');
                newParams.set(cleanKey, val.join(','));
            }
        });

        // Don't update URL if it hasn't changed (prevents history spam)
        if (newParams.toString() !== searchParams.toString()) {
            setSearchParams(newParams, { replace: true });
        }
    }, [branch, from, to, advParams, searchParams, setSearchParams]);
}
