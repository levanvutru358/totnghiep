/** Ngưỡng: giá catalog < 100_000 được coi là đơn vị nghìn đồng (129 → 129.000 VND). */
export const CATALOG_VND_THRESHOLD = 100_000;

/** Giá dòng giỏ / sản phẩm → VND đầy đủ để so với khuyến mãi admin. */
export const catalogToFullVnd = (catalogAmount: number): number => {
  if (!Number.isFinite(catalogAmount)) return 0;
  if (catalogAmount >= CATALOG_VND_THRESHOLD) return Math.round(catalogAmount);
  return Math.round(catalogAmount * 1000);
};

/** Số tiền khuyến mãi (admin, VND đầy đủ) → đơn vị catalog cho tính tổng đơn. */
export const fullVndToCatalog = (vnd: number): number => {
  if (!Number.isFinite(vnd)) return 0;
  if (vnd >= CATALOG_VND_THRESHOLD) return Math.round(vnd);
  return Math.round(vnd) / 1000;
};

export const formatCatalogVnd = (catalogAmount: number): string =>
  `${catalogToFullVnd(catalogAmount).toLocaleString('vi-VN')}đ`;

/** Mã khuyến mãi: số admin nhập là VND đầy đủ (5_000 = 5.000đ). */
export const formatPromotionVnd = (vnd: number): string =>
  `${Math.round(vnd).toLocaleString('vi-VN')}đ`;
