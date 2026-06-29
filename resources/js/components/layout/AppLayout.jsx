import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { selectSidebarOpen } from '../../store/reportSlice';
import { Sidebar } from './Sidebar';

export const AppLayout = ({ children, topbar, onPrint }) => {
    const open = useSelector(selectSidebarOpen);

    return (
        <div className="flex min-h-screen bg-slate-100">
            <Sidebar onPrint={onPrint} />
            <motion.div
                animate={{ marginLeft: open ? 220 : 60 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex-1 flex flex-col min-h-screen"
            >
                {topbar}
                {children}
            </motion.div>
        </div>
    );
};
