import { useRef } from 'react';
import { Upload, FileText, BarChart3, CreditCard, Hospital, Building2, Stethoscope, Package } from 'lucide-react';
import { cn } from '../../utils/cn';

const FILE_TYPES = [
    { label: 'Bill Items',    icon: BarChart3,   color: 'text-blue-600   bg-blue-50'   },
    { label: 'Cashier',       icon: CreditCard,  color: 'text-green-600  bg-green-50'  },
    { label: 'IP Admission',  icon: Building2,   color: 'text-violet-600 bg-violet-50' },
    { label: 'ER Admission',  icon: Hospital,    color: 'text-red-600    bg-red-50'    },
    { label: 'Surgery',       icon: Stethoscope, color: 'text-amber-600  bg-amber-50'  },
    { label: 'Packages',      icon: Package,     color: 'text-cyan-600   bg-cyan-50'   },
];

export const DropZone = ({ onFiles, isDragging, setIsDragging, fileCount = 0 }) => {
    const ref = useRef(null);

    const handle = (rawFiles) => {
        const csvs = Array.from(rawFiles).filter(
            f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv'
        );
        if (csvs.length) onFiles(csvs);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="Upload CSV files — drag & drop or press Enter to browse"
            onKeyDown={handleKeyDown}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handle(e.dataTransfer.files); }}
            onClick={() => ref.current?.click()}
            className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
                isDragging
                    ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70',
            )}
        >
            <input
                ref={ref}
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                aria-hidden="true"
                onChange={e => { handle(e.target.files); e.target.value = ''; }}
            />

            {/* Upload icon */}
            <div className={cn(
                'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors',
                isDragging ? 'bg-blue-100' : 'bg-slate-100',
            )}>
                <Upload className={cn('w-7 h-7 transition-transform', isDragging ? 'text-blue-600 scale-110' : 'text-slate-400')} />
            </div>

            {/* Primary text */}
            <div className="text-[15px] font-700 text-slate-700 mb-1">
                {isDragging ? 'Release to add files' : fileCount > 0 ? 'Drop more files to add' : 'Drop KareXpert CSV files here'}
            </div>
            <div className="text-[12px] text-slate-400 mb-5">
                {fileCount > 0
                    ? `${fileCount} file${fileCount !== 1 ? 's' : ''} added — you can drop more`
                    : 'Multiple files accepted — types are auto-detected'}
            </div>

            {/* Browse button */}
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                <FileText className="w-4 h-4" />
                Browse Files
            </span>

            {/* Accepted file type chips */}
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {FILE_TYPES.map(({ label, icon: Icon, color }) => (
                    <span
                        key={label}
                        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600', color)}
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                    </span>
                ))}
            </div>

            <div className="text-[11px] text-slate-400 mt-3">Accepts .csv · Up to 20 MB each</div>
        </div>
    );
};
