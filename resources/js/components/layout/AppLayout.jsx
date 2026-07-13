import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, Home, Menu, Hospital } from 'lucide-react';
import { selectSidebarOpen, setSidebarOpen, toggleSidebar } from '../../store/reportSlice';
import { Sidebar } from './Sidebar';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { useIsMobile } from '../../hooks/useIsMobile';

// Pages that use the global date filter
const DATE_FILTER_ROUTES = new Set([
    '/brm', '/financial', '/operational', '/mis', '/surgery', '/pharmacy',
    '/doctors', '/departments',
]);

const BREADCRUMB_MAP = {
    '/dashboard':     ['Dashboard'],
    '/import':        ['Data Management', 'Import Center'],
    '/reports':       ['Reports', 'Report Center'],
    '/mis':           ['Reports', 'MIS Reports'],
    '/brm':           ['Reports', 'BRM Reports'],
    '/financial':     ['Reports', 'Financial Reports'],
    '/operational':   ['Reports', 'Operational Reports'],
    '/doctors':       ['Analytics', 'Doctor Analytics'],
    '/departments':   ['Analytics', 'Department Analytics'],
    '/surgery':       ['Analytics', 'Surgery Analytics'],
    '/pharmacy':      ['Analytics', 'Pharmacy Analytics'],
    '/scheduler':     ['Administration', 'Scheduler'],
    '/notifications': ['Administration', 'Notifications'],
    '/users':         ['Administration', 'User Management'],
    '/roles':         ['Administration', 'Role Management'],
    '/audit-logs':    ['Administration', 'Audit Logs'],
    '/settings':      ['Administration', 'Settings'],
};

const Breadcrumb = () => {
    const { pathname } = useLocation();
    const crumbs = BREADCRUMB_MAP[pathname] || [];
    if (!crumbs.length) return null;
    return (
        <nav className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <NavLink to="/dashboard" className="hover:text-slate-600 transition-colors no-underline text-slate-400">
                <Home className="w-3.5 h-3.5" />
            </NavLink>
            {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className={i === crumbs.length - 1 ? 'text-slate-700 font-600' : 'text-slate-400'}>{c}</span>
                </span>
            ))}
        </nav>
    );
};

export const AppLayout = ({ children, topbar, onPrint }) => {
    const open     = useSelector(selectSidebarOpen);
    const dispatch = useDispatch();
    const isMobile = useIsMobile();
    const { pathname } = useLocation();
    const showBreadcrumb  = pathname !== '/dashboard' && BREADCRUMB_MAP[pathname];
    const showDateFilter  = DATE_FILTER_ROUTES.has(pathname);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50/80">
            {/* Mobile backdrop */}
            <AnimatePresence>
                {isMobile && open && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="sidebar-backdrop"
                        onClick={() => dispatch(setSidebarOpen(false))}
                    />
                )}
            </AnimatePresence>

            <Sidebar isMobile={isMobile} />

            <motion.div
                animate={{ marginLeft: isMobile ? 0 : (open ? 232 : 60) }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex-1 flex flex-col h-screen overflow-hidden min-w-0"
            >
                {/* ── Mobile top bar (hamburger + brand) ── */}
                {isMobile && (
                    <div className="flex items-center gap-3 px-3 h-[48px] bg-white border-b border-slate-200 flex-shrink-0">
                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            aria-label="Open navigation menu"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors border-0 cursor-pointer focus-ring"
                        >
                            <Menu className="w-4.5 h-4.5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-[7px] bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
                                <Hospital className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-[13px] font-700 text-slate-800">Hospital MIS</span>
                        </div>
                    </div>
                )}

                {topbar}

                {showBreadcrumb && (
                    <div className="px-5 py-2 border-b border-slate-200 bg-white">
                        <Breadcrumb />
                    </div>
                )}

                {showDateFilter && <DateRangeFilter />}

                {children}
            </motion.div>
        </div>
    );
};
