import { motion } from 'framer-motion';
import { FileSearch } from 'lucide-react';

export const EmptyState = ({ icon: Icon = FileSearch, title, description, action }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-12 px-8 text-center"
    >
        <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                <Icon className="w-6 h-6 text-slate-400" />
            </div>
            {/* Decorative ring */}
            <div className="absolute -inset-2 rounded-3xl border border-dashed border-slate-200 opacity-50" />
        </div>
        <h3 className="text-[14px] font-700 text-slate-700 mb-1.5">{title}</h3>
        {description && (
            <p className="text-[12px] text-slate-400 max-w-[240px] leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
    </motion.div>
);
