export function normalizePermissions(user) {
    const raw = Array.isArray(user?.permissions) ? user.permissions : [];
    return [
        ...new Set(
            raw.filter((item) => typeof item === "string" && item.trim()),
        ),
    ];
}

export function hasRole(user, role) {
    if (!user) return false;
    const target = String(role || "")
        .trim()
        .toLowerCase();
    if (!target) return false;

    return (user.roles ?? []).some((assigned) => {
        const name = String(assigned?.name || "")
            .trim()
            .toLowerCase();
        const slug = String(assigned?.slug || "")
            .trim()
            .toLowerCase();
        return name === target || slug === target;
    });
}

export function hasPermission(user, permission) {
    if (!user) return false;
    const permissions = normalizePermissions(user);
    const target = String(permission || "").trim();
    if (!target) return false;

    if (permissions.includes("*") || permissions.includes(target)) return true;

    const module = target.split(".")[0];
    return permissions.includes(`${module}.*`);
}

export function hasAnyPermission(user, ...permissions) {
    return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user, ...permissions) {
    return (
        permissions.length > 0 &&
        permissions.every((permission) => hasPermission(user, permission))
    );
}

export function canAccessBranch(user, branch) {
    if (!user) return false;
    if (
        hasRole(user, "super admin") ||
        hasRole(user, "super-admin") ||
        hasRole(user, "admin")
    )
        return true;

    const raw = user.assigned_branches ?? user.branches ?? [];
    const allowed = Array.isArray(raw) ? raw : [];
    if (allowed.length === 0) return true;

    if (branch == null || branch === "") return true;
    const requested = Array.isArray(branch) ? branch : [branch];
    return requested.every((entry) => allowed.includes(entry));
}

export function canAccessDepartment(user, department) {
    if (!user) return false;
    if (
        hasRole(user, "super admin") ||
        hasRole(user, "super-admin") ||
        hasRole(user, "admin")
    )
        return true;

    const raw = user.assigned_departments ?? user.departments ?? [];
    const allowed = Array.isArray(raw) ? raw : [];
    if (allowed.length === 0) return true;

    if (department == null || department === "") return true;
    const requested = Array.isArray(department) ? department : [department];
    return requested.every((entry) => allowed.includes(entry));
}
