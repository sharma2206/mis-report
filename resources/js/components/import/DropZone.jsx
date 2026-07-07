import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

export const DropZone = ({ onFiles, isDragging, setIsDragging }) => {
    const ref = useRef(null);

    const handle = (rawFiles) => {
        const csvs = Array.from(rawFiles).filter(
            f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv'
        );
        if (csvs.length) onFiles(csvs);
    };

    return (
        <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handle(e.dataTransfer.files); }}
            onClick={() => ref.current?.click()}
            className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer select-none transition-all duration-200',
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70',
            )}
        >
            <input ref={ref} type="file" accept=".csv" multiple className="hidden"
                onChange={e => { handle(e.target.files); e.target.value = ''; }} />
            <div className={cn(
                'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors',
                isDragging ? 'bg-blue-100' : 'bg-slate-100',
            )}>
                <Upload className={cn('w-7 h-7', isDragging ? 'text-blue-600' : 'text-slate-400')} />
            </div>
            <div className="text-[15px] font-700 text-slate-700 mb-1">
                {isDragging ? 'Release to add files' : 'Drop KareXpert CSV files here'}
            </div>
            <div className="text-[12px] text-slate-400 mb-5">
                Bill Items · Cashier Collection · ER Admission · IP Admission · Surgery · Packages
            </div>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                <FileText className="w-4 h-4" /> Browse Files
            </span>
            <div className="text-[11px] text-slate-400 mt-3">Accepts .csv · Multiple files · Up to 20 MB each</div>
        </div>
    );
};
