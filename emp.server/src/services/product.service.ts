import {
  productRepository,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilters,
} from '../repositories/product.repository';
import { productImageRepository } from '../repositories/product-image.repository';
import { productColorImageRepository } from '../repositories/product-color-image.repository';
import { colorRepository } from '../repositories/color.repository';
import { parseProductImageUrlsField } from '../lib/parse-product-image-urls';
import { parseProductColorImagesField } from '../lib/parse-product-color-images';
import { bumpPublicContentRevision } from './public-revision.service';
import { marketingRepository } from '../repositories/marketing.repository';
import { computeMarketingSalePrice } from './marketing.service';

const groupColorImages = (rows: Awaited<ReturnType<typeof productColorImageRepository.listByProductId>>) => {
  const map = new Map<number, { colorId: number; colorName: string; images: string[] }>();
  for (const row of rows) {
    const existing = map.get(row.color_id);
    if (existing) {
      existing.images.push(row.image_url);
    } else {
      map.set(row.color_id, {
        colorId: row.color_id,
        colorName: row.color_name,
        images: [row.image_url],
      });
    }
  }
  return Array.from(map.values());
};

const attachProductImages = async (product: Record<string, unknown>) => {
  const productId = Number(product.id);
  if (!Number.isFinite(productId)) return product;

  const [rows, colorRows] = await Promise.all([
    productImageRepository.listByProductId(productId),
    productColorImageRepository.listByProductId(productId),
  ]);
  const images = rows.map((row) => row.image_url);
  const thumbnail = typeof product.thumbnail_url === 'string' ? product.thumbnail_url : null;
  const colorImages = groupColorImages(colorRows);
  const flatFromColors = colorImages.flatMap((item) => item.images);

  return {
    ...product,
    colorImages,
    images:
      flatFromColors.length > 0
        ? flatFromColors
        : images.length > 0
          ? images
          : thumbnail
            ? [thumbnail]
            : [],
  };
};

const saveProductColorImages = async (productId: number, body: Record<string, unknown>) => {
  const colorImages = parseProductColorImagesField(body);
  if (colorImages.length === 0) return null;

  const entries: Array<{ colorId: number; imageUrls: string[] }> = [];
  for (const item of colorImages) {
    const colorId = await colorRepository.findOrCreateByName(item.color);
    entries.push({ colorId, imageUrls: item.imageUrls });
  }

  const allUrls = await productColorImageRepository.replaceAll(productId, entries);
  if (allUrls.length > 0) {
    await productImageRepository.replaceAll(productId, allUrls);
    await productRepository.update(productId, { thumbnailUrl: allUrls[0] });
  }
  return allUrls[0] ?? null;
};

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

const resolveUniqueProductSlug = async (baseSlug: string, excludeProductId?: number): Promise<string> => {
  const normalized = baseSlug.trim().toLowerCase() || 'san-pham';
  let candidate = normalized;
  let suffix = 2;

  while (await productRepository.isSlugTaken(candidate, excludeProductId)) {
    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const parseBooleanField = (value: unknown, defaultValue = false): boolean => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return defaultValue;
};

const buildMarketingOffer = (
  product: { base_price?: number; sale_price?: number | null },
  discountPercent: number,
  badgeLabel?: string | null,
  section?: string,
) => {
  const basePrice = Number(product.base_price ?? 0);
  const saleRaw = product.sale_price;
  const salePrice =
    saleRaw != null && Number.isFinite(Number(saleRaw)) ? Number(saleRaw) : null;
  const catalogPrice =
    salePrice !== null && salePrice < basePrice ? salePrice : basePrice;
  const pct = Math.min(100, Math.max(0, Number(discountPercent)));
  if (pct <= 0) return null;

  const displayPrice = computeMarketingSalePrice(
    basePrice,
    salePrice,
    pct,
    catalogPrice,
  );

  return {
    discountPercent: pct,
    badgeLabel: badgeLabel?.trim() || `-${Math.round(pct)}%`,
    catalogPrice,
    displayPrice,
    section: section ?? '',
  };
};

const attachMarketingOffers = async <T extends { id: number; base_price?: number; sale_price?: number | null }>(
  items: T[],
) => {
  const productIds = items.map((item) => Number(item.id));
  const offers = await marketingRepository.findActiveOffersForProductIds(productIds);

  return items.map((product) => {
    const pct = offers.get(Number(product.id));
    if (pct == null) return product;
    const marketingOffer = buildMarketingOffer(product, pct);
    if (!marketingOffer) return product;
    return { ...product, marketingOffer };
  });
};

export const productService = {
  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = toPositiveNumber(query.limit) ?? 10;
    const maxLimit = 100;

    const statusRaw = typeof query.status === 'string' ? query.status.trim() : '';
    const status =
      statusRaw === 'active' || statusRaw === 'inactive' ? (statusRaw as 'active' | 'inactive') : undefined;

    const filters: ProductListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      categoryId: toPositiveNumber(query.categoryId),
      categorySlug:
        typeof query.categorySlug === 'string' && query.categorySlug.trim()
          ? query.categorySlug.trim()
          : typeof query.category === 'string' && query.category.trim()
            ? query.category.trim()
            : undefined,
      brandId: toPositiveNumber(query.brandId),
      minPrice: typeof query.minPrice !== 'undefined' ? Number(query.minPrice) : undefined,
      maxPrice: typeof query.maxPrice !== 'undefined' ? Number(query.maxPrice) : undefined,
      isFeatured:
        typeof query.isFeatured === 'string'
          ? query.isFeatured === 'true'
          : typeof query.isFeatured === 'boolean'
          ? query.isFeatured
          : undefined,
      page,
      limit: Math.min(limit, maxLimit),
      status,
      includeInactive: query.includeInactive === true || query.includeInactive === 'true',
    };

    const result = await productRepository.list(filters);
    const items = await attachMarketingOffers(result.items);
    return { ...result, items };
  },

  async detail(identifier: string, includeInactive = false) {
    const product = await productRepository.getByIdOrSlug(identifier, includeInactive);
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const [variants, related] = await Promise.all([
      productRepository.getVariants(product.id),
      productRepository.getRelated(product.id),
    ]);

    const withImages = await attachProductImages(product);
    const offerRow = await marketingRepository.findBestActiveOfferForProduct(Number(product.id));
    let marketingOffer: {
      discountPercent: number;
      badgeLabel: string | null;
      catalogPrice: number;
      displayPrice: number;
      section: string;
    } | null = null;

    if (offerRow) {
      marketingOffer = buildMarketingOffer(
        product,
        Number(offerRow.discount_percent),
        offerRow.badge_label,
        offerRow.section,
      );
    }

    return { ...withImages, variants, relatedProducts: related, marketingOffer };
  },

  async create(body: Record<string, unknown>) {
    const required = ['name', 'slug', 'categoryId', 'brandId', 'basePrice'];
    for (const field of required) {
      if (typeof body[field] === 'undefined' || body[field] === null || body[field] === '') {
        throw new Error(`MISSING_${field.toUpperCase()}`);
      }
    }

    const input: CreateProductInput = {
      name: String(body.name).trim(),
      slug: String(body.slug).trim(),
      categoryId: Number(body.categoryId),
      brandId: Number(body.brandId),
      shortDescription: body.shortDescription ? String(body.shortDescription) : null,
      description: body.description ? String(body.description) : null,
      basePrice: Number(body.basePrice),
      salePrice: typeof body.salePrice !== 'undefined' && body.salePrice !== null ? Number(body.salePrice) : null,
      thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
      isFeatured: parseBooleanField(body.isFeatured, false),
      isActive: typeof body.isActive !== 'undefined' ? parseBooleanField(body.isActive, true) : true,
    };

    if (!Number.isFinite(input.categoryId) || input.categoryId < 1) {
      throw new Error('INVALID_CATEGORY_ID');
    }
    if (!Number.isFinite(input.brandId) || input.brandId < 1) {
      throw new Error('INVALID_BRAND_ID');
    }
    if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
      throw new Error('INVALID_BASE_PRICE');
    }

    input.slug = await resolveUniqueProductSlug(input.slug);

    const created = await productRepository.create(input);
    const productId = Number(created.id);
    const colorThumbnail = await saveProductColorImages(productId, body);
    if (colorThumbnail) {
      bumpPublicContentRevision();
      return productRepository.getByIdOrSlug(String(productId), true);
    }

    const imageUrls = parseProductImageUrlsField(body);
    if (imageUrls.length > 0) {
      const savedUrls = await productImageRepository.replaceAll(productId, imageUrls);
      if (savedUrls[0]) {
        bumpPublicContentRevision();
        return productRepository.update(productId, { thumbnailUrl: savedUrls[0] });
      }
    }
    bumpPublicContentRevision();
    return created;
  },

  async update(identifier: string, body: Record<string, unknown>) {
    const existing = await productRepository.getByIdOrSlug(identifier, true);
    if (!existing) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const input: UpdateProductInput = {};
    if (typeof body.name !== 'undefined') input.name = String(body.name).trim();
    if (typeof body.slug !== 'undefined') input.slug = String(body.slug).trim();
    if (typeof body.categoryId !== 'undefined') input.categoryId = Number(body.categoryId);
    if (typeof body.brandId !== 'undefined') input.brandId = Number(body.brandId);
    if (typeof body.shortDescription !== 'undefined')
      input.shortDescription = body.shortDescription ? String(body.shortDescription) : null;
    if (typeof body.description !== 'undefined')
      input.description = body.description ? String(body.description) : null;
    if (typeof body.basePrice !== 'undefined') input.basePrice = Number(body.basePrice);
    if (typeof body.salePrice !== 'undefined')
      input.salePrice = body.salePrice !== null ? Number(body.salePrice) : null;
    if (typeof body.thumbnailUrl !== 'undefined')
      input.thumbnailUrl = body.thumbnailUrl ? String(body.thumbnailUrl) : null;
    if (typeof body.isFeatured !== 'undefined') input.isFeatured = parseBooleanField(body.isFeatured, false);
    if (typeof body.isActive !== 'undefined') input.isActive = parseBooleanField(body.isActive, true);

    if (typeof input.categoryId !== 'undefined') {
      if (!Number.isFinite(input.categoryId) || input.categoryId < 1) {
        throw new Error('INVALID_CATEGORY_ID');
      }
    }
    if (typeof input.brandId !== 'undefined') {
      if (!Number.isFinite(input.brandId) || input.brandId < 1) {
        throw new Error('INVALID_BRAND_ID');
      }
    }
    if (typeof input.basePrice !== 'undefined') {
      if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
        throw new Error('INVALID_BASE_PRICE');
      }
    }

    if (typeof input.slug !== 'undefined') {
      input.slug = await resolveUniqueProductSlug(input.slug, Number(existing.id));
    }

    const updated = await productRepository.update(Number(existing.id), input);
    const productId = Number(existing.id);

    if (typeof body.colorImages !== 'undefined' || typeof body.colorImageGroups !== 'undefined') {
      await saveProductColorImages(productId, body);
      bumpPublicContentRevision();
      return productRepository.getByIdOrSlug(String(productId), true);
    }

    if (typeof body.imageUrls !== 'undefined' || typeof body.imageUrl !== 'undefined') {
      const imageUrls = parseProductImageUrlsField(body);
      const savedUrls = await productImageRepository.replaceAll(productId, imageUrls);
      const thumbnailUrl = savedUrls[0] ?? null;
      bumpPublicContentRevision();
      return productRepository.update(productId, { thumbnailUrl });
    }

    bumpPublicContentRevision();
    return updated;
  },

  async remove(identifier: string) {
    const existing = await productRepository.getByIdOrSlug(identifier, true);
    if (!existing) {
      throw new Error('PRODUCT_NOT_FOUND');
    }
    await productRepository.softDelete(Number(existing.id));
    bumpPublicContentRevision();
  },

  async related(identifier: string) {
    const existing = await productRepository.getByIdOrSlug(identifier);
    if (!existing) throw new Error('PRODUCT_NOT_FOUND');
    return productRepository.getRelated(Number(existing.id));
  },

  async addRelated(identifier: string, body: Record<string, unknown>) {
    const existing = await productRepository.getByIdOrSlug(identifier);
    if (!existing) throw new Error('PRODUCT_NOT_FOUND');
    if (typeof body.relatedProductId === 'undefined') throw new Error('MISSING_RELATEDPRODUCTID');
    const relationType =
      body.relationType === 'CROSS_SELL' || body.relationType === 'UP_SELL' ? body.relationType : 'RELATED';
    return productRepository.addRelated(
      Number(existing.id),
      Number(body.relatedProductId),
      relationType,
      typeof body.sortOrder !== 'undefined' ? Number(body.sortOrder) : 0,
    );
  },

  async removeRelated(identifier: string, body: Record<string, unknown>) {
    const existing = await productRepository.getByIdOrSlug(identifier);
    if (!existing) throw new Error('PRODUCT_NOT_FOUND');
    if (typeof body.relatedProductId === 'undefined') throw new Error('MISSING_RELATEDPRODUCTID');
    const relationType =
      body.relationType === 'RELATED' || body.relationType === 'CROSS_SELL' || body.relationType === 'UP_SELL'
        ? body.relationType
        : undefined;
    await productRepository.removeRelated(Number(existing.id), Number(body.relatedProductId), relationType);
    return productRepository.getRelated(Number(existing.id));
  },
};

