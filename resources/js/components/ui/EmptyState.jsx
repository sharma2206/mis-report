import { motion } from 'framer-motion';
import { FileSearch } from 'lucide-react';

export const EmptyState = ({ icon: Icon = FileSearch, title, description, action }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-12 px-8 text-center"
    >
        <div className="mb-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-hover-bg)] border border-[var(--color-border)] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[var(--color-muted)]" />
            </div>
        </div>
        <h3 className="text-[14px] font-700 text-slate-700 mb-1.5">{title}</h3>
        {description && (
            <p className="text-[12px] text-slate-400 max-w-[240px] leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
    </motion.div>
);
