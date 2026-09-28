import { createSlice } from '@reduxjs/toolkit';

const stored = localStorage.getItem('mis_user');
const initialUser = stored ? JSON.parse(stored) : null;

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: initialUser,
    },
    reducers: {
        setCredentials(state, { payload: { user } }) {
            state.user = user;
            localStorage.setItem('mis_user', JSON.stringify(user));
        },
        clearCredentials(state) {
            state.user = null;
            localStorage.removeItem('mis_user');
        },
    },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export const selectAuth            = (s) => s.auth;
export const selectUser            = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => !!s.auth.user;
// Alias: pages that guard with `if (!token)` continue to work — evaluates to true/false
export const selectToken           = selectIsAuthenticated;
export default authSlice.reducer;
