import {
  sizeRepository,
  CreateSizeInput,
  UpdateSizeInput,
  SizeListFilters,
} from '../repositories/size.repository';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const assertPositiveIntegerId = (id: number) => {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('INVALID_SIZE_ID');
  }
};

export const sizeService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);
    const filters: SizeListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit,
    };
    return sizeRepository.list(filters);
  },
  async detail(id: number) {
    assertPositiveIntegerId(id);
    const size = await sizeRepository.getById(id);
    if (!size) throw new Error('SIZE_NOT_FOUND');
    return size;
  },
  async create(body: Record<string, unknown>) {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    if (typeof b.label === 'undefined' || b.label === null || String(b.label).trim() === '') {
      throw new Error('MISSING_LABEL');
    }
    const sortOrder =
      typeof b.sortOrder !== 'undefined' && b.sortOrder !== null ? Number(b.sortOrder) : 0;
    if (!Number.isFinite(sortOrder)) {
      throw new Error('INVALID_SORTORDER');
    }
    const input: CreateSizeInput = {
      label: String(b.label).trim(),
      sortOrder,
    };
    return sizeRepository.create(input);
  },
  async update(id: number, body: Record<string, unknown>) {
    assertPositiveIntegerId(id);
    const existing = await sizeRepository.getById(id);
    if (!existing) throw new Error('SIZE_NOT_FOUND');
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const input: UpdateSizeInput = {};
    if (typeof b.label !== 'undefined') input.label = String(b.label).trim();
    if (typeof b.sortOrder !== 'undefined') input.sortOrder = Number(b.sortOrder);
    if (typeof b.isActive !== 'undefined') input.isActive = Boolean(b.isActive);
    return sizeRepository.update(id, input);
  },
  async remove(id: number) {
    assertPositiveIntegerId(id);
    const existing = await sizeRepository.getById(id);
    if (!existing) throw new Error('SIZE_NOT_FOUND');
    await sizeRepository.softDelete(id);
  },
};
