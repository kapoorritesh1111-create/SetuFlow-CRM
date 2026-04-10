import type { ProductsSpreadsheetRow } from './products-table-types';

export type ProductsSortKey = 'product_name' | 'pack_label' | 'moq' | 'ex_factory' | 'fob';

export type ProductsTableColumn = {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
  sortKey?: ProductsSortKey;
  sticky?: 'left';
  widthClassName?: string;
  render: (row: ProductsSpreadsheetRow) => React.ReactNode;
};
