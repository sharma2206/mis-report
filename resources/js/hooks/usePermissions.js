import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';

export function usePermissions() {
    const user = useSelector(selectUser);
    const perms = user?.permissions ?? [];
    const hasWildcard = perms.includes('*');

    const can = (permission) => {
        // Legacy admin bypass
        if (user?.role === 'admin') return true;
        return hasWildcard || perms.includes(permission);
    };

    const canAny = (...permissions) => permissions.some((p) => can(p));
    const canAll = (...permissions) => permissions.every((p) => can(p));

    return { can, canAny, canAll, permissions: perms };
}
