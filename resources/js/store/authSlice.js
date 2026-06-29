import { createSlice } from '@reduxjs/toolkit';

const stored = localStorage.getItem('mis_user');
const initialUser = stored ? JSON.parse(stored) : null;

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        token: localStorage.getItem('mis_token') || null,
        user:  initialUser,
    },
    reducers: {
        setCredentials(state, { payload: { token, user } }) {
            state.token = token;
            state.user  = user;
            localStorage.setItem('mis_token', token);
            localStorage.setItem('mis_user',  JSON.stringify(user));
        },
        clearCredentials(state) {
            state.token = null;
            state.user  = null;
            localStorage.removeItem('mis_token');
            localStorage.removeItem('mis_user');
        },
    },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export const selectAuth  = (s) => s.auth;
export const selectUser  = (s) => s.auth.user;
export const selectToken = (s) => s.auth.token;
export default authSlice.reducer;
