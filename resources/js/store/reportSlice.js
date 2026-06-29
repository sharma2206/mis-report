import { createSlice } from '@reduxjs/toolkit';
import { today } from '../utils/dateHelpers';

const reportSlice = createSlice({
    name: 'report',
    initialState: {
        branch:     sessionStorage.getItem('mis_last_branch') || 'chromepet',
        date:       sessionStorage.getItem('mis_last_date')   || today(),
        activeTab:  'overview',
        sidebarOpen: true,
    },
    reducers: {
        setBranch(state, { payload }) {
            state.branch = payload;
        },
        setDate(state, { payload }) {
            state.date = payload;
        },
        setActiveTab(state, { payload }) {
            state.activeTab = payload;
        },
        toggleSidebar(state) {
            state.sidebarOpen = !state.sidebarOpen;
        },
    },
});

export const { setBranch, setDate, setActiveTab, toggleSidebar } = reportSlice.actions;
export const selectBranch     = (s) => s.report.branch;
export const selectDate       = (s) => s.report.date;
export const selectActiveTab  = (s) => s.report.activeTab;
export const selectSidebarOpen = (s) => s.report.sidebarOpen;
export default reportSlice.reducer;
