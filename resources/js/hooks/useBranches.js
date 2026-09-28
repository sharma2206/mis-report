import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { branchesApi } from '../services/api';
import { selectUser } from '../store/authSlice';
import { BRANCHES } from '../constants';

const ALL_BRANCHES = Object.entries(BRANCHES).map(([key, { label, beds }]) => ({ key, label, beds }));

/**
 * Fetches the branch list from the API, then filters it to branches the
 * current user is permitted to access (user.branches array, if provided).
 * Falls back to the hardcoded BRANCHES constant when the API is unavailable.
 */
export const useBranches = () => {
    const user = useSelector(selectUser);

    const { data, isLoading } = useQuery({
        queryKey: ['branches'],
        queryFn:  () => branchesApi.list().then(r => r.data),
        staleTime: 1000 * 60 * 60,
        retry: 1,
    });

    const rawList = (() => {
        if (!data?.success || !Array.isArray(data.data) || data.data.length === 0) return ALL_BRANCHES;
        return data.data.map(b => ({
            key:   b.key  || b.slug || b.code,
            label: b.name || b.label,
            beds:  b.beds ?? b.total_beds ?? 0,
        }));
    })();

    // Apply branch-scoped access control if the user object carries a branches list
    const allowedKeys = Array.isArray(user?.branches) && user.branches.length > 0
        ? new Set(user.branches)
        : null;

    const branches = allowedKeys
        ? rawList.filter(b => allowedKeys.has(b.key))
        : rawList;

    return { branches, isLoading };
};
