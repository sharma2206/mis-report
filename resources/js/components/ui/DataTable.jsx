import { useState, useMemo } from 'react';
import {
    useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
    getPaginationRowModel, flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const SortIcon = ({ sorted }) => {
    if (!sorted) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />;
    return sorted === 'asc'
        ? <ChevronUp   className="w-3 h-3 text-blue-500" />
        : <ChevronDown className="w-3 h-3 text-blue-500" />;
};

/**
 * Reusable TanStack Table component.
 *
 * Props:
 *  data       – array of row objects
 *  columns    – TanStack column defs (use createColumnHelper or plain objects)
 *  pageSize   – rows per page (default 15)
 *  searchable – show global search input (default true)
 *  className  – wrapper className
 *  emptyText  – message when no rows
 */
export default function DataTable({
    data = [],
    columns = [],
    pageSize = 15,
    searchable = true,
    className,
    emptyText = 'No data',
}) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter, sorting, pagination },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: 'includesString',
    });

    const { rows } = table.getRowModel();
    const totalFiltered = table.getFilteredRowModel().rows.length;
    const pageCount = table.getPageCount();

    return (
        <div className={cn('space-y-3', className)}>
            {searchable && (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-blue-400 bg-white max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Search…"
                        className="flex-1 text-[12px] outline-none bg-transparent placeholder:text-slate-400"
                    />
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-[12px]">
                    <thead>
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id} className="border-b border-slate-100 bg-slate-50/60">
                                {hg.headers.map(header => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={cn(
                                            'py-2 px-3 text-left text-[10px] font-700 uppercase tracking-wider text-slate-400 whitespace-nowrap',
                                            header.column.getCanSort() && 'cursor-pointer hover:text-slate-600 select-none',
                                            header.column.columnDef.meta?.align === 'right' && 'text-right',
                                        )}
                                    >
                                        <div className={cn('flex items-center gap-1', header.column.columnDef.meta?.align === 'right' && 'justify-end')}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-8 text-center text-[12px] text-slate-400">{emptyText}</td>
                            </tr>
                        ) : rows.map((row, idx) => (
                            <tr key={row.id} className={cn('border-b border-slate-50 hover:bg-slate-50 transition-colors', idx % 2 === 0 ? '' : 'bg-slate-50/30')}>
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        className={cn(
                                            'py-2 px-3 text-slate-700',
                                            cell.column.columnDef.meta?.align === 'right' && 'text-right',
                                            cell.column.columnDef.meta?.className,
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        {totalFiltered.toLocaleString()} row{totalFiltered !== 1 ? 's' : ''}
                        {globalFilter && ` (filtered)`}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer bg-white">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-slate-600 px-2">
                            {table.getState().pagination.pageIndex + 1} / {pageCount}
                        </span>
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer bg-white">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
