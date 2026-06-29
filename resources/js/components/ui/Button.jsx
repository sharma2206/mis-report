import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const variants = {
    primary: 'bg-gradient-to-r from-blue-700 to-violet-600 text-white border-transparent shadow-md hover:opacity-90 hover:shadow-lg',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50',
    danger:  'bg-white text-red-600 border-slate-200 hover:border-red-400 hover:bg-red-50',
    success: 'bg-white text-emerald-600 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50',
    ghost:   'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
};

const sizes = {
    sm:  'px-3 py-1.5 text-xs gap-1',
    md:  'px-4 py-2 text-sm gap-1.5',
    lg:  'px-5 py-2.5 text-sm gap-2',
    xl:  'px-6 py-3 text-base gap-2',
};

export const Button = ({
    children, variant = 'secondary', size = 'md',
    className, disabled, loading, icon: Icon, iconEnd: IconEnd, as: Tag = 'button', ...props
}) => (
    <motion.div whileTap={disabled ? {} : { scale: 0.97 }} className="inline-flex">
        <Tag
            className={cn(
                'inline-flex items-center justify-center font-semibold border-[1.5px] rounded-lg transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
                variants[variant],
                sizes[size],
                disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                className,
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : Icon ? (
                <Icon className="w-4 h-4 flex-shrink-0" />
            ) : null}
            {children}
            {IconEnd && !loading && <IconEnd className="w-4 h-4 flex-shrink-0" />}
        </Tag>
    </motion.div>
);
