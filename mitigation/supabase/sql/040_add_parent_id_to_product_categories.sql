-- 040_add_parent_id_to_product_categories.sql
--
-- This migration adds a self‑referential parent_id column to the
-- product_categories table to support hierarchical category
-- relationships.  Prior to this change product categories were
-- strictly flat; adding a parent_id allows categories to be nested
-- arbitrarily deep.  The column is nullable so that root
-- categories continue to function without a parent.  A foreign key
-- constraint enforces referential integrity within the same table.

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES product_categories (id);
