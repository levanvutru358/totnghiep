UPDATE categories
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE parent_id IS NOT NULL;

ALTER TABLE categories DROP FOREIGN KEY fk_categories_parent;
ALTER TABLE categories DROP COLUMN parent_id;
