import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { selectSidebarOpen } from '../../store/reportSlice';
import { Sidebar } from './Sidebar';

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
                    <span className={i === crumbs.length - 1 ? 'text-slate-600 font-600' : 'text-slate-400'}>{c}</span>
                </span>
            ))}
        </nav>
    );
};

export const AppLayout = ({ children, topbar, onPrint }) => {
    const open = useSelector(selectSidebarOpen);
    const { pathname } = useLocation();
    const showBreadcrumb = pathname !== '/dashboard' && BREADCRUMB_MAP[pathname];

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar onPrint={onPrint} />
            <motion.div
                animate={{ marginLeft: open ? 232 : 60 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex-1 flex flex-col min-h-screen min-w-0"
            >
                {topbar}
                {showBreadcrumb && (
                    <div className="px-5 py-2 border-b border-slate-200 bg-white">
                        <Breadcrumb />
                    </div>
                )}
                {children}
            </motion.div>
        </div>
    );
};
