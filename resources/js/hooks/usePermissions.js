import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice";
import {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
} from "../utils/authorization";

export function usePermissions() {
    const user = useSelector(selectUser);
    const permissions = Array.isArray(user?.permissions)
        ? user.permissions
        : [];

    const can = (permission) => hasPermission(user, permission);
    const canAny = (...permissionList) =>
        hasAnyPermission(user, ...permissionList);
    const canAll = (...permissionList) =>
        hasAllPermissions(user, ...permissionList);
    const hasUserRole = (role) => hasRole(user, role);

    return { can, canAny, canAll, hasRole: hasUserRole, permissions };
}
