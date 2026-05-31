import { pool } from '../configs/database.config';

export type RevenueRange = 'daily' | 'weekly' | 'monthly';

const revenueExpression =
  'ABS(it.quantity) * COALESCE(NULLIF(pv.price, 0), p.sale_price, p.base_price, 0)';

export const dashboardRepository = {
  async getMetricsSnapshot() {
    const [revenueRows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(${revenueExpression}), 0) AS total_revenue,
        COUNT(*) AS outbound_records,
        COUNT(DISTINCT NULLIF(it.reference_code, '')) AS referenced_orders
      FROM inventory_transactions it
      INNER JOIN product_variants pv ON pv.id = it.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE it.transaction_type = 'OUT'
      `,
    );

    const [flowRows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN transaction_type = 'IN' THEN 1 ELSE 0 END) AS inbound_count,
        SUM(CASE WHEN transaction_type = 'OUT' THEN 1 ELSE 0 END) AS outbound_count
      FROM inventory_transactions
      `,
    );

    return {
      revenue: (revenueRows as any[])[0] ?? {},
      flow: (flowRows as any[])[0] ?? {},
    };
  },

  async getRevenueSeries(range: RevenueRange) {
    if (range === 'daily') {
      const [rows] = await pool.query(
        `
        SELECT
          DATE(it.created_at) AS bucket,
          COALESCE(SUM(${revenueExpression}), 0) AS revenue
        FROM inventory_transactions it
        INNER JOIN product_variants pv ON pv.id = it.variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE it.transaction_type = 'OUT'
          AND DATE(it.created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(it.created_at)
        ORDER BY bucket ASC
        `,
      );
      return rows as any[];
    }

    if (range === 'weekly') {
      const [rows] = await pool.query(
        `
        SELECT
          YEAR(it.created_at) AS year,
          WEEK(it.created_at, 1) AS week,
          COALESCE(SUM(${revenueExpression}), 0) AS revenue
        FROM inventory_transactions it
        INNER JOIN product_variants pv ON pv.id = it.variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE it.transaction_type = 'OUT'
          AND DATE(it.created_at) >= DATE_SUB(CURDATE(), INTERVAL 5 WEEK)
        GROUP BY YEAR(it.created_at), WEEK(it.created_at, 1)
        ORDER BY YEAR(it.created_at), WEEK(it.created_at, 1)
        `,
      );
      return rows as any[];
    }

    const [rows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(it.created_at, '%Y-%m') AS bucket,
        COALESCE(SUM(${revenueExpression}), 0) AS revenue
      FROM inventory_transactions it
      INNER JOIN product_variants pv ON pv.id = it.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE it.transaction_type = 'OUT'
        AND DATE(it.created_at) >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(it.created_at, '%Y-%m')
      ORDER BY bucket ASC
      `,
    );
    return rows as any[];
  },

  async getRecentOutbound(limit = 20) {
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(it.reference_code, ''), CONCAT('TX-', it.id)) AS order_code,
        COALESCE(NULLIF(it.created_by, ''), 'Walk-in') AS customer_name,
        MAX(it.created_at) AS created_at,
        COALESCE(SUM(${revenueExpression}), 0) AS amount
      FROM inventory_transactions it
      INNER JOIN product_variants pv ON pv.id = it.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE it.transaction_type = 'OUT'
      GROUP BY order_code, customer_name
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [limit],
    );
    return rows as any[];
  },

  async getLowStockProducts(limit = 8) {
    const [rows] = await pool.query(
      `
      SELECT
        pv.id,
        p.name,
        pv.sku,
        pv.stock_quantity,
        GREATEST(pv.min_stock_threshold, 5) AS threshold,
        c.name AS category_name
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE pv.is_active = 1
        AND p.is_active = 1
        AND pv.stock_quantity <= GREATEST(pv.min_stock_threshold, 5)
      ORDER BY pv.stock_quantity ASC, pv.updated_at ASC
      LIMIT ?
      `,
      [limit],
    );
    return rows as any[];
  },

  async getTopCustomers(limit = 5) {
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(it.created_by, ''), 'Walk-in') AS customer_name,
        COALESCE(SUM(${revenueExpression}), 0) AS total_spent,
        GREATEST(COUNT(DISTINCT NULLIF(it.reference_code, '')), 1) AS order_count
      FROM inventory_transactions it
      INNER JOIN product_variants pv ON pv.id = it.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE it.transaction_type = 'OUT'
      GROUP BY customer_name
      ORDER BY total_spent DESC
      LIMIT ?
      `,
      [limit],
    );
    return rows as any[];
  },

  async getTopCategories(limit = 5) {
    const [rows] = await pool.query(
      `
      SELECT
        c.name AS category_name,
        COALESCE(SUM(ABS(it.quantity)), 0) AS sales
      FROM inventory_transactions it
      INNER JOIN product_variants pv ON pv.id = it.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE it.transaction_type = 'OUT'
      GROUP BY c.id, c.name
      ORDER BY sales DESC
      LIMIT ?
      `,
      [limit],
    );
    return rows as any[];
  },
};
