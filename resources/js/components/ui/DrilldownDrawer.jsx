import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const DrilldownDrawer = ({ open, title, description, onClose, children }) => {
    const closeRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            previous?.focus?.();
        };
    }, [open, onClose]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[80]">
                    <motion.button
                        type="button"
                        aria-label="Close details"
                        className="absolute inset-0 border-0 bg-slate-950/35 cursor-default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="drilldown-title"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-0 bottom-0 w-full sm:w-[min(760px,92vw)] flex flex-col"
                        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-dropdown)' }}
                    >
                        <header className="flex items-start gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <div className="min-w-0">
                                <h2 id="drilldown-title" className="text-[16px] font-650" style={{ color: 'var(--color-text)' }}>{title}</h2>
                                {description && <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>{description}</p>}
                            </div>
                            <button
                                ref={closeRef}
                                type="button"
                                aria-label="Close details"
                                onClick={onClose}
                                className="ml-auto w-9 h-9 rounded-md border flex items-center justify-center cursor-pointer"
                                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4">{children}</div>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
};
