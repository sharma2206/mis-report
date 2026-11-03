import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';
import { legacyCan } from '../utils/legacyPermissions';

export function usePermissions() {
    const user = useSelector(selectUser);
    const perms = user?.permissions ?? [];
    const hasWildcard = perms.includes('*');
    const hasAssignedRoles = Array.isArray(user?.roles) && user.roles.length > 0;

    const can = (permission) => {
        if (user?.role === 'admin' || hasWildcard || perms.includes(permission)) return true;
        const module = permission.split('.')[0];
        if (perms.includes(`${module}.*`)) return true;
        // Sessions saved before /auth/me refreshed have no role list.
        // An assigned RBAC role is authoritative, including an empty permission set.
        if (hasAssignedRoles) return false;
        return legacyCan(user?.role, permission);
    };

    const canAny = (...permissions) => permissions.some((p) => can(p));
    const canAll = (...permissions) => permissions.every((p) => can(p));

    return { can, canAny, canAll, permissions: perms };
}
