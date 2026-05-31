import {
  inventoryRepository,
  CreateInventoryTransactionInput,
  InventoryListFilters,
  InventoryTransactionType,
} from '../repositories/inventory.repository';
import { bumpPublicContentRevision } from './public-revision.service';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const isTxType = (value: unknown): value is InventoryTransactionType =>
  value === 'IN' || value === 'OUT' || value === 'ADJUSTMENT';

export const inventoryService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);
    const txType = isTxType(query.transactionType) ? query.transactionType : undefined;
    const brand = typeof query.brand === 'string' && query.brand.trim() ? query.brand.trim() : undefined;
    const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;
    const dateFrom = typeof query.dateFrom === 'string' && query.dateFrom.trim() ? query.dateFrom.trim() : undefined;
    const dateTo = typeof query.dateTo === 'string' && query.dateTo.trim() ? query.dateTo.trim() : undefined;
    const filters: InventoryListFilters = {
      variantId: toPositiveNumber(query.variantId),
      transactionType: txType,
      brand,
      search,
      dateFrom,
      dateTo,
      page,
      limit,
    };
    return inventoryRepository.list(filters);
  },

  async create(body: Record<string, unknown>) {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const required = ['variantId', 'transactionType', 'quantity'] as const;
    for (const field of required) {
      if (typeof b[field] === 'undefined' || b[field] === null || b[field] === '') {
        throw new Error(`MISSING_${field.toUpperCase()}`);
      }
    }
    if (!isTxType(b.transactionType)) throw new Error('INVALID_TRANSACTION_TYPE');

    const variantId = Number(b.variantId);
    if (!Number.isInteger(variantId) || variantId < 1) {
      throw new Error('INVALID_INVENTORY_VARIANT_ID');
    }

    const quantity = Number(b.quantity);
    if (!Number.isFinite(quantity)) {
      throw new Error('INVALID_QUANTITY');
    }
    if (b.transactionType === 'IN' || b.transactionType === 'OUT') {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('INVALID_QUANTITY');
      }
    } else {
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error('INVALID_QUANTITY');
      }
    }

    const input: CreateInventoryTransactionInput = {
      variantId,
      transactionType: b.transactionType,
      quantity,
      note: b.note ? String(b.note) : null,
      referenceCode: b.referenceCode ? String(b.referenceCode) : null,
      createdBy: b.createdBy ? String(b.createdBy) : null,
    };
    const created = await inventoryRepository.createAndApplyStock(input);
    bumpPublicContentRevision();
    return created;
  },

  async update(transactionId: number, body: Record<string, unknown>) {
    const existing = await inventoryRepository.getById(transactionId);
    if (!existing) throw new Error('TRANSACTION_NOT_FOUND');

    const input: import('../repositories/inventory.repository').UpdateInventoryTransactionInput = {};

    if (typeof body.transactionType !== 'undefined') {
      if (!isTxType(body.transactionType)) throw new Error('INVALID_TRANSACTION_TYPE');
      input.transactionType = body.transactionType;
    }
    if (typeof body.quantity !== 'undefined') {
      input.quantity = Number(body.quantity);
    }
    if (typeof body.note !== 'undefined') {
      input.note = body.note ? String(body.note) : null;
    }

    const updated = await inventoryRepository.updateById(transactionId, input);
    bumpPublicContentRevision();
    return updated;
  },

  async remove(transactionId: number) {
    const existing = await inventoryRepository.getById(transactionId);
    if (!existing) throw new Error('TRANSACTION_NOT_FOUND');
    const removed = await inventoryRepository.deleteById(transactionId);
    bumpPublicContentRevision();
    return removed;
  },
};
