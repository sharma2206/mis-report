import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export const MultiSelectDropdown = ({
    label,
    options, // Array of strings or objects {label, value}
    selected, // Array of selected values
    onChange,
    placeholder = 'Select...',
    searchable = false,
    className,
    disabled = false,
    defaultLabel = 'All', // What to show when nothing is selected (or when "All" is a valid conceptual state)
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Normalize options to {label, value}
    const normalizedOptions = useMemo(() => {
        return options.map(opt => typeof opt === 'string' ? { label: opt, value: opt } : opt);
    }, [options]);

    const filteredOptions = useMemo(() => {
        if (!query) return normalizedOptions;
        const q = query.toLowerCase();
        return normalizedOptions.filter(o => o.label.toLowerCase().includes(q));
    }, [normalizedOptions, query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && searchable && inputRef.current) {
            inputRef.current.focus();
        }
        if (!open) setQuery('');
    }, [open, searchable]);

    const handleSelect = (val) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };

    const handleSelectAll = () => {
        if (selected.length === normalizedOptions.length) {
            onChange([]);
        } else {
            onChange(normalizedOptions.map(o => o.value));
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange([]);
        setOpen(false);
    };

    const displayValue = selected.length === 0
        ? defaultLabel
        : selected.length === 1
            ? normalizedOptions.find(o => o.value === selected[0])?.label || selected[0]
            : selected.length === normalizedOptions.length && normalizedOptions.length > 0
                ? `All ${label}s`
                : `${selected.length} Selected`;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div className="flex flex-col gap-1">
                {label && <label className="text-[10px] font-700 uppercase tracking-wider text-slate-500 ml-0.5">{label}</label>}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen(!open)}
                    className={cn(
                        "flex items-center justify-between w-full min-w-[140px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-left text-[12px] font-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
                        open ? "border-blue-400 ring-2 ring-blue-500/15" : "hover:border-slate-300"
                    )}
                >
                    <span className="truncate text-slate-700">{displayValue}</span>
                    <div className="flex items-center gap-1 ml-2">
                        {selected.length > 0 && selected.length !== normalizedOptions.length && (
                            <div
                                onClick={handleClear}
                                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </div>
                        )}
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
                    </div>
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-[240px] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col"
                    >
                        {searchable && (
                            <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                                <Search className="w-3.5 h-3.5 text-slate-400 ml-1 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full text-[12px] border-none focus:outline-none focus:ring-0 p-0 text-slate-700 bg-transparent"
                                />
                            </div>
                        )}
                        
                        {normalizedOptions.length > 1 && !query && (
                            <div className="p-1 border-b border-slate-100 bg-slate-50/50">
                                <button
                                    onClick={handleSelectAll}
                                    className="w-full text-left px-2 py-1.5 text-[11px] font-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                >
                                    {selected.length === normalizedOptions.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        )}

                        <div className="max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-[11px] text-slate-500">No results found</div>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isSelected = selected.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSelect(opt.value)}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-[12px] font-500 rounded-md hover:bg-slate-50 transition-colors"
                                        >
                                            <span className={cn("truncate", isSelected ? "text-blue-700 font-600" : "text-slate-700")}>
                                                {opt.label}
                                            </span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-2" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
