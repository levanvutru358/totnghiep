import {
  categoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryListFilters,
} from '../repositories/category.repository';
import { bumpPublicContentRevision } from './public-revision.service';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

export const categoryService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = toPositiveNumber(query.limit) ?? 10;
    const maxLimit = 200;

    const filters: CategoryListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit: Math.min(limit, maxLimit),
    };

    return categoryRepository.list(filters);
  },

  async detail(identifier: string) {
    const category = await categoryRepository.getByIdOrSlug(identifier);
    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }
    return category;
  },

  async create(body: Record<string, unknown>) {
    const required = ['name', 'slug'];
    for (const field of required) {
      if (typeof body[field] === 'undefined' || body[field] === null || body[field] === '') {
        throw new Error(`MISSING_${field.toUpperCase()}`);
      }
    }

    const parentIdRaw = body.parentId ?? body.parent_id;
    const parentId =
      parentIdRaw !== undefined && parentIdRaw !== null && parentIdRaw !== ''
        ? Number(parentIdRaw)
        : null;

    const input: CreateCategoryInput = {
      name: String(body.name).trim(),
      slug: String(body.slug).trim(),
      description: body.description ? String(body.description) : null,
      parentId: Number.isFinite(parentId) && parentId! > 0 ? parentId : null,
    };

    try {
      const created = await categoryRepository.create(input);
      bumpPublicContentRevision();
      return created;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'ER_DUP_ENTRY') {
        const created = await categoryRepository.create({
          ...input,
          slug: `${input.slug}-${Date.now()}`,
        });
        bumpPublicContentRevision();
        return created;
      }
      throw error;
    }
  },

  async update(identifier: string, body: Record<string, unknown>) {
    const existing = await categoryRepository.getByIdOrSlug(identifier);
    if (!existing) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    const input: UpdateCategoryInput = {};
    if (typeof body.name !== 'undefined') input.name = String(body.name).trim();
    if (typeof body.slug !== 'undefined') input.slug = String(body.slug).trim();
    if (typeof body.description !== 'undefined')
      input.description = body.description ? String(body.description) : null;
    if (typeof body.isActive !== 'undefined') input.isActive = Boolean(body.isActive);

    const updated = await categoryRepository.update(Number(existing.id), input);
    bumpPublicContentRevision();
    return updated;
  },

  async remove(identifier: string) {
    const existing = await categoryRepository.getByIdOrSlug(identifier);
    if (!existing) {
      throw new Error('CATEGORY_NOT_FOUND');
    }
    await categoryRepository.softDelete(Number(existing.id));
    bumpPublicContentRevision();
  },
};
