import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, CreditCard, TrendingUp, BarChart2,
    BedDouble, Stethoscope, UserCheck, UploadCloud,
    Printer, LogOut, ChevronLeft, Hospital,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarOpen, toggleSidebar, selectActiveTab, setActiveTab } from '../../store/reportSlice';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const REPORT_TABS = [
    { key: 'overview',  label: 'Overview',    Icon: LayoutDashboard },
    { key: 'revenue',   label: 'Revenue',     Icon: CreditCard },
    { key: 'volume',    label: 'Volume & MRI', Icon: TrendingUp },
    { key: 'analytics', label: 'Analytics',   Icon: BarChart2 },
    { key: 'ip',        label: 'IP Analytics', Icon: BedDouble },
    { key: 'surgery',   label: 'Surgery',      Icon: Stethoscope },
    { key: 'op',        label: 'OP Analytics', Icon: UserCheck },
];

export const Sidebar = ({ onPrint }) => {
    const open      = useSelector(selectSidebarOpen);
    const activeTab = useSelector(selectActiveTab);
    const user      = useSelector(selectUser);
    const dispatch  = useDispatch();
    const { logout } = useAuth();

    const name = user?.name || user?.email || 'User';
    const role = user?.role || 'viewer';
    const initial = name.charAt(0).toUpperCase();

    return (
        <motion.aside
            animate={{ width: open ? 220 : 60 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="fixed left-0 top-0 bottom-0 bg-slate-900 flex flex-col z-50 overflow-hidden"
        >
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-white/8 min-h-[58px] flex-shrink-0">
                <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/30">
                    <Hospital className="w-4.5 h-4.5 text-white" />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 overflow-hidden">
                            <span className="text-sm font-700 text-white whitespace-nowrap">Hospital MIS</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-600">v2.0</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    className={cn('w-6 h-6 rounded-md bg-white/7 border-0 cursor-pointer text-white/50 hover:bg-white/15 hover:text-white flex items-center justify-center transition-colors flex-shrink-0', open ? 'ml-auto' : 'mx-auto')}
                >
                    <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.22 }}>
                        <ChevronLeft className="w-4 h-4" />
                    </motion.div>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
                <div className="px-2">
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-[9px] font-700 uppercase tracking-widest text-white/25 px-2 py-1.5 whitespace-nowrap">
                                Reports
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {REPORT_TABS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => dispatch(setActiveTab(key))}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border-0 text-left w-full transition-all duration-150 mb-0.5 font-500 text-sm whitespace-nowrap',
                                activeTab === key
                                    ? 'bg-blue-700/35 text-blue-300'
                                    : 'text-white/55 hover:bg-white/7 hover:text-white',
                            )}
                        >
                            <Icon className={cn('w-5 h-5 flex-shrink-0', activeTab === key && 'text-blue-400')} />
                            <AnimatePresence>
                                {open && (
                                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    ))}

                    <div className="my-2 h-px bg-white/7 mx-1" />

                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-[9px] font-700 uppercase tracking-widest text-white/25 px-2 py-1.5 whitespace-nowrap">
                                Actions
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <NavLink to="/upload"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/55 hover:bg-white/7 hover:text-white transition-all duration-150 mb-0.5 font-500 text-sm whitespace-nowrap no-underline"
                    >
                        <UploadCloud className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                            {open && (
                                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                                    Upload Data
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>

                    <button
                        onClick={onPrint}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/55 hover:bg-white/7 hover:text-white transition-all duration-150 mb-0.5 font-500 text-sm whitespace-nowrap w-full border-0 text-left cursor-pointer"
                    >
                        <Printer className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                            {open && (
                                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                                    Print Report
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-300/70 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 font-500 text-sm whitespace-nowrap w-full border-0 text-left cursor-pointer"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                            {open && (
                                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                                    Sign Out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </nav>

            {/* User */}
            <div className="px-3 py-2.5 border-t border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-700 flex-shrink-0">
                        {initial}
                    </div>
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden min-w-0">
                                <div className="text-[12px] font-600 text-white/80 truncate">{name}</div>
                                <div className="text-[10px] text-white/35 capitalize">{role}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.aside>
    );
};
