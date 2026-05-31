-- Đồng bộ like_count = số user thực sự đã like (mỗi user tối đa 1 like / comment|review)
UPDATE product_comments c
SET c.like_count = (
  SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id
);

UPDATE product_reviews r
SET r.like_count = (
  SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id
);
