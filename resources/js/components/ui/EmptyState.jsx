import { motion } from 'framer-motion';

export const EmptyState = ({ icon: Icon, title, description, action }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
        {Icon && (
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-blue-600" />
            </div>
        )}
        <h3 className="text-base font-700 text-slate-800 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </motion.div>
);
