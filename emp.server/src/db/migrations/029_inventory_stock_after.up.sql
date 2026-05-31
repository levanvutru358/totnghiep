ALTER TABLE inventory_transactions
  ADD COLUMN stock_after INT NULL AFTER quantity;

UPDATE inventory_transactions it
INNER JOIN product_variants pv ON pv.id = it.variant_id
SET it.stock_after = pv.stock_quantity
WHERE it.stock_after IS NULL;
