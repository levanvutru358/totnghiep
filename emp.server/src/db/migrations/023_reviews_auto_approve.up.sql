UPDATE product_reviews
SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
WHERE status = 'PENDING';
