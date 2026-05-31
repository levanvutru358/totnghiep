import {
  variantRepository,
  CreateVariantInput,
  UpdateVariantInput,
  VariantListFilters,
} from '../repositories/variant.repository';
import { bumpPublicContentRevision } from './public-revision.service';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const assertPositiveIntegerId = (id: number) => {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('INVALID_VARIANT_ID');
  }
};

export const variantService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);
    const filters: VariantListFilters = {
      productId: toPositiveNumber(query.productId),
      sizeId: toPositiveNumber(query.sizeId),
      colorId: toPositiveNumber(query.colorId),
      sku: typeof query.sku === 'string' ? query.sku.trim() : undefined,
      page,
      limit,
    };
    return variantRepository.list(filters);
  },
  async detail(id: number) {
    assertPositiveIntegerId(id);
    const item = await variantRepository.getById(id);
    if (!item) throw new Error('VARIANT_NOT_FOUND');
    return item;
  },
  async create(body: Record<string, unknown>) {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const required = ['productId', 'sizeId', 'colorId', 'sku'] as const;
    for (const field of required) {
      if (typeof b[field] === 'undefined' || b[field] === null || b[field] === '') {
        throw new Error(`MISSING_${field.toUpperCase()}`);
      }
    }
    const sku = String(b.sku).trim();
    if (sku === '') {
      throw new Error('MISSING_SKU');
    }
    const productId = Number(b.productId);
    const sizeId = Number(b.sizeId);
    const colorId = Number(b.colorId);
    if (!Number.isInteger(productId) || productId < 1) {
      throw new Error('INVALID_VARIANT_IDS');
    }
    if (!Number.isInteger(sizeId) || sizeId < 1 || !Number.isInteger(colorId) || colorId < 1) {
      throw new Error('INVALID_VARIANT_IDS');
    }
    const stockQuantity =
      typeof b.stockQuantity !== 'undefined' && b.stockQuantity !== null ? Number(b.stockQuantity) : 0;
    const minStockThreshold =
      typeof b.minStockThreshold !== 'undefined' && b.minStockThreshold !== null
        ? Number(b.minStockThreshold)
        : 0;
    if (!Number.isFinite(stockQuantity) || !Number.isFinite(minStockThreshold)) {
      throw new Error('INVALID_STOCK_FIELDS');
    }
    const price = typeof b.price !== 'undefined' && b.price !== null ? Number(b.price) : null;
    if (price !== null && !Number.isFinite(price)) {
      throw new Error('INVALID_PRICE');
    }
    const input: CreateVariantInput = {
      productId,
      sizeId,
      colorId,
      sku,
      barcode: b.barcode ? String(b.barcode).trim() : null,
      price,
      stockQuantity,
      minStockThreshold,
    };
    const created = await variantRepository.create(input);
    bumpPublicContentRevision();
    return created;
  },
  async update(id: number, body: Record<string, unknown>) {
    assertPositiveIntegerId(id);
    const existing = await variantRepository.getById(id);
    if (!existing) throw new Error('VARIANT_NOT_FOUND');
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const input: UpdateVariantInput = {};
    if (typeof b.sizeId !== 'undefined') {
      const v = Number(b.sizeId);
      if (!Number.isInteger(v) || v < 1) throw new Error('INVALID_VARIANT_IDS');
      input.sizeId = v;
    }
    if (typeof b.colorId !== 'undefined') {
      const v = Number(b.colorId);
      if (!Number.isInteger(v) || v < 1) throw new Error('INVALID_VARIANT_IDS');
      input.colorId = v;
    }
    if (typeof b.sku !== 'undefined') {
      const s = String(b.sku).trim();
      if (s === '') throw new Error('MISSING_SKU');
      input.sku = s;
    }
    if (typeof b.barcode !== 'undefined') input.barcode = b.barcode ? String(b.barcode).trim() : null;
    if (typeof b.price !== 'undefined') {
      input.price = b.price !== null ? Number(b.price) : null;
      if (input.price !== null && !Number.isFinite(input.price)) throw new Error('INVALID_PRICE');
    }
    if (typeof b.stockQuantity !== 'undefined') {
      input.stockQuantity = Number(b.stockQuantity);
      if (!Number.isFinite(input.stockQuantity!)) throw new Error('INVALID_STOCK_FIELDS');
    }
    if (typeof b.minStockThreshold !== 'undefined') {
      input.minStockThreshold = Number(b.minStockThreshold);
      if (!Number.isFinite(input.minStockThreshold!)) throw new Error('INVALID_STOCK_FIELDS');
    }
    if (typeof b.isActive !== 'undefined') input.isActive = Boolean(b.isActive);
    const updated = await variantRepository.update(id, input);
    bumpPublicContentRevision();
    return updated;
  },
  async remove(id: number) {
    assertPositiveIntegerId(id);
    const existing = await variantRepository.getById(id);
    if (!existing) throw new Error('VARIANT_NOT_FOUND');
    await variantRepository.softDelete(id);
    bumpPublicContentRevision();
  },
  async stock(id: number) {
    assertPositiveIntegerId(id);
    const existing = await variantRepository.getById(id);
    if (!existing) throw new Error('VARIANT_NOT_FOUND');
    return {
      variantId: existing.id,
      sku: existing.sku,
      stockQuantity: existing.stock_quantity,
      minStockThreshold: existing.min_stock_threshold,
      isLowStock: Number(existing.stock_quantity) <= Number(existing.min_stock_threshold),
    };
  },
};
