import { createSlice } from "@reduxjs/toolkit";

const normalizeUser = (user) => {
    if (!user || typeof user !== "object") return null;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];

    const primaryRole =
        roles[0]?.name || roles[0]?.slug || user.role || "viewer";

    return {
        ...user,
        role: primaryRole,
        roles,
        permissions: permissions.filter(
            (p) => typeof p === "string" && p.trim(),
        ),
        assigned_branches: Array.isArray(user.assigned_branches)
            ? user.assigned_branches
            : Array.isArray(user.branches)
              ? user.branches
              : [],
        assigned_departments: Array.isArray(user.assigned_departments)
            ? user.assigned_departments
            : Array.isArray(user.departments)
              ? user.departments
              : [],
    };
};

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem("mis_user");
        return raw ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
        localStorage.removeItem("mis_user");
        return null;
    }
};

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: readStoredUser(),
        loading: false,
    },
    reducers: {
        setCredentials(state, { payload: { user } }) {
            const normalized = normalizeUser(user);
            state.user = normalized;
            state.loading = false;

            if (normalized) {
                localStorage.setItem("mis_user", JSON.stringify(normalized));
                return;
            }

            localStorage.removeItem("mis_user");
        },
        clearCredentials(state) {
            state.user = null;
            state.loading = false;
            localStorage.removeItem("mis_user");
        },
        setAuthLoading(state, { payload }) {
            state.loading = !!payload;
        },
    },
});

export const { setCredentials, clearCredentials, setAuthLoading } =
    authSlice.actions;
export const selectAuth = (s) => s.auth;
export const selectUser = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => !!s.auth.user;
export const selectAuthLoading = (s) => !!s.auth.loading;
export const selectToken = selectIsAuthenticated;
export default authSlice.reducer;
