import {
  brandRepository,
  CreateBrandInput,
  UpdateBrandInput,
  BrandListFilters,
} from '../repositories/brand.repository';
import { bumpPublicContentRevision } from './public-revision.service';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

export const brandService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = toPositiveNumber(query.limit) ?? 10;
    const maxLimit = 100;

    const filters: BrandListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit: Math.min(limit, maxLimit),
    };

    return brandRepository.list(filters);
  },

  async detail(identifier: string) {
    const brand = await brandRepository.getByIdOrSlug(identifier);
    if (!brand) {
      throw new Error('BRAND_NOT_FOUND');
    }
    return brand;
  },

  async create(body: Record<string, unknown>) {
    const required = ['name', 'slug'];
    for (const field of required) {
      if (typeof body[field] === 'undefined' || body[field] === null || body[field] === '') {
        throw new Error(`MISSING_${field.toUpperCase()}`);
      }
    }

    const input: CreateBrandInput = {
      name: String(body.name).trim(),
      slug: String(body.slug).trim(),
      description: body.description ? String(body.description) : null,
    };

    const created = await brandRepository.create(input);
    bumpPublicContentRevision();
    return created;
  },

  async update(identifier: string, body: Record<string, unknown>) {
    const existing = await brandRepository.getByIdOrSlug(identifier);
    if (!existing) {
      throw new Error('BRAND_NOT_FOUND');
    }

    const input: UpdateBrandInput = {};
    if (typeof body.name !== 'undefined') input.name = String(body.name).trim();
    if (typeof body.slug !== 'undefined') input.slug = String(body.slug).trim();
    if (typeof body.description !== 'undefined')
      input.description = body.description ? String(body.description) : null;
    if (typeof body.isActive !== 'undefined') input.isActive = Boolean(body.isActive);

    const updated = await brandRepository.update(Number(existing.id), input);
    bumpPublicContentRevision();
    return updated;
  },

  async remove(identifier: string) {
    const existing = await brandRepository.getByIdOrSlug(identifier);
    if (!existing) {
      throw new Error('BRAND_NOT_FOUND');
    }
    await brandRepository.softDelete(Number(existing.id));
    bumpPublicContentRevision();
  },
};
