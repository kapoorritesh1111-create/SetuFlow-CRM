import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  workspaceTableBodyClass,
  workspaceTableHeaderClass,
  workspaceTableRowClass,
  workspaceTableShellClass,
} from '@/components/ui/workspace-surfaces';

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({ columns, rows, rowKey }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string }) {
  return (
    <div className={workspaceTableShellClass}>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[720px] divide-y divide-slate-200/80 md:min-w-full dark:divide-slate-700/70">
          <thead className={workspaceTableHeaderClass}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] first:pl-5 last:pr-5',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-slate-100/90 dark:divide-slate-800/80', workspaceTableBodyClass)}>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={workspaceTableRowClass}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3.5 align-top text-sm text-slate-700 first:pl-5 last:pr-5 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
