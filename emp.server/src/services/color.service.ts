import {
  colorRepository,
  CreateColorInput,
  UpdateColorInput,
  ColorListFilters,
} from '../repositories/color.repository';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const assertPositiveIntegerId = (id: number) => {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('INVALID_COLOR_ID');
  }
};

export const colorService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);
    const filters: ColorListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit,
    };
    return colorRepository.list(filters);
  },
  async detail(id: number) {
    assertPositiveIntegerId(id);
    const color = await colorRepository.getById(id);
    if (!color) throw new Error('COLOR_NOT_FOUND');
    return color;
  },
  async create(body: Record<string, unknown>) {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    if (typeof b.name === 'undefined' || b.name === null || String(b.name).trim() === '') {
      throw new Error('MISSING_NAME');
    }
    const sortOrder =
      typeof b.sortOrder !== 'undefined' && b.sortOrder !== null ? Number(b.sortOrder) : 0;
    if (!Number.isFinite(sortOrder)) {
      throw new Error('INVALID_SORTORDER');
    }
    const input: CreateColorInput = {
      name: String(b.name).trim(),
      hexCode: b.hexCode ? String(b.hexCode).trim() : null,
      sortOrder,
    };
    return colorRepository.create(input);
  },
  async update(id: number, body: Record<string, unknown>) {
    assertPositiveIntegerId(id);
    const existing = await colorRepository.getById(id);
    if (!existing) throw new Error('COLOR_NOT_FOUND');
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const input: UpdateColorInput = {};
    if (typeof b.name !== 'undefined') input.name = String(b.name).trim();
    if (typeof b.hexCode !== 'undefined') input.hexCode = b.hexCode ? String(b.hexCode).trim() : null;
    if (typeof b.sortOrder !== 'undefined') input.sortOrder = Number(b.sortOrder);
    if (typeof b.isActive !== 'undefined') input.isActive = Boolean(b.isActive);
    return colorRepository.update(id, input);
  },
  async remove(id: number) {
    assertPositiveIntegerId(id);
    const existing = await colorRepository.getById(id);
    if (!existing) throw new Error('COLOR_NOT_FOUND');
    await colorRepository.softDelete(id);
  },
};
