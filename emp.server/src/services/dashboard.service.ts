import { dashboardRepository, RevenueRange } from '../repositories/dashboard.repository';

type DashboardStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const normalizeRange = (value: unknown): RevenueRange => {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
  return 'weekly';
};

const toStatus = (seed: string): DashboardStatus => {
  const score = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10;
  if (score <= 1) return 'pending';
  if (score <= 6) return 'paid';
  if (score <= 8) return 'shipped';
  return 'cancelled';
};

const toEmail = (name: string): string => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `${slug || 'guest'}@emp.local`;
};

export const dashboardService = {
  async getMetrics() {
    const snapshot = await dashboardRepository.getMetricsSnapshot();
    const totalRevenue = Number(snapshot.revenue.total_revenue || 0);
    const outboundRecords = Number(snapshot.revenue.outbound_records || 0);
    const referencedOrders = Number(snapshot.revenue.referenced_orders || 0);
    const totalOrders = referencedOrders > 0 ? referencedOrders : outboundRecords;
    const inbound = Number(snapshot.flow.inbound_count || 0);
    const outbound = Number(snapshot.flow.outbound_count || 0);
    const conversionRate = inbound + outbound > 0 ? (outbound / (inbound + outbound)) * 100 : 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      conversionRate: Number(conversionRate.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
    };
  },

  async getRevenueSeries(rangeQuery: unknown) {
    const range = normalizeRange(rangeQuery);
    const rows = await dashboardRepository.getRevenueSeries(range);

    if (range === 'daily') {
      const map = new Map<string, number>(
        rows.map((item) => [new Date(item.bucket).toISOString().slice(0, 10), Number(item.revenue || 0)]),
      );
      const result = [];
      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const iso = date.toISOString().slice(0, 10);
        result.push({
          label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
          value: Number((map.get(iso) ?? 0).toFixed(2)),
        });
      }
      return result;
    }

    if (range === 'weekly') {
      const keyMap = new Map<string, number>(rows.map((item) => [`${item.year}-${item.week}`, Number(item.revenue || 0)]));
      const result = [];
      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        const year = date.getFullYear();
        const oneJan = new Date(year, 0, 1);
        const week = Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
        result.push({
          label: `W${week}`,
          value: Number((keyMap.get(`${year}-${week}`) ?? 0).toFixed(2)),
        });
      }
      return result;
    }

    const map = new Map<string, number>(rows.map((item) => [String(item.bucket), Number(item.revenue || 0)]));
    const result = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const bucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        label: monthLabels[date.getMonth()],
        value: Number((map.get(bucket) ?? 0).toFixed(2)),
      });
    }
    return result;
  },

  async getRecentOrders(status?: unknown) {
    const rows = await dashboardRepository.getRecentOutbound(20);
    const mapped = rows.map((item) => ({
      id: String(item.order_code),
      customer: String(item.customer_name),
      amount: Number(item.amount || 0),
      status: toStatus(String(item.order_code)),
      createdAt: new Date(item.created_at).toISOString(),
    }));
    if (!status || status === 'all') return mapped;
    return mapped.filter((item) => item.status === status);
  },

  async getLowStockProducts() {
    const rows = await dashboardRepository.getLowStockProducts(8);
    return rows.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      sku: String(item.sku),
      stock: Number(item.stock_quantity || 0),
      threshold: Number(item.threshold || 0),
      category: String(item.category_name),
    }));
  },

  async getTopCustomers() {
    const rows = await dashboardRepository.getTopCustomers(5);
    return rows.map((item, index) => ({
      id: `c-${index + 1}`,
      name: String(item.customer_name),
      email: toEmail(String(item.customer_name)),
      totalSpent: Number(item.total_spent || 0),
      orderCount: Number(item.order_count || 0),
    }));
  },

  async getTopCategories() {
    const rows = await dashboardRepository.getTopCategories(5);
    return rows.map((item) => ({
      category: String(item.category_name),
      sales: Number(item.sales || 0),
    }));
  },

  async getOrderStatusDistribution() {
    const orders = await this.getRecentOrders('all');
    const total = orders.length;
    const statuses: DashboardStatus[] = ['pending', 'paid', 'shipped', 'cancelled'];
    return statuses.map((status) => {
      const count = orders.filter((item) => item.status === status).length;
      const value = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
      return { status, value };
    });
  },
};
