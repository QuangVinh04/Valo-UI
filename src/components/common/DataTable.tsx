import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
};

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  getRowKey: (item: T, index: number) => string;
  className?: string;
  getRowClassName?: (item: T, index: number) => string | undefined;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ') || undefined;
}

function DataTable<T>({
  columns,
  data,
  getRowKey,
  className = '',
  getRowClassName,
}: DataTableProps<T>) {
  return (
    <table className={joinClassNames('data-table', className)}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              className={joinClassNames(column.className, column.headerClassName)}
              key={column.key}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr className={getRowClassName?.(item, index)} key={getRowKey(item, index)}>
            {columns.map((column) => (
              <td
                className={joinClassNames(column.className, column.cellClassName)}
                key={column.key}
              >
                {column.render(item, index)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataTable;
