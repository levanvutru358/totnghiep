import {
  isMarketingBannerPlacement,
  isMarketingHomeSection,
  type MarketingHomeSectionCode,
} from '../constants/marketing';
import {
  marketingRepository,
  type MarketingBannerRow,
  type MarketingFlashSaleRow,
} from '../repositories/marketing.repository';
import { bumpPublicContentRevision } from './public-revision.service';

const toIso = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

const mapBanner = (row: MarketingBannerRow) => ({
  id: Number(row.id),
  placement: row.placement,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  linkUrl: row.link_url,
  ctaLabel: row.cta_label,
  sortOrder: Number(row.sort_order),
  isActive: Boolean(row.is_active),
  startsAt: toIso(row.starts_at),
  endsAt: toIso(row.ends_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const mapHomeSection = (row: import('../repositories/marketing.repository').MarketingHomeSectionRow) => ({
  code: row.code,
  title: row.title,
  subtitle: row.subtitle,
  badgeLabel: row.badge_label,
  linkUrl: row.link_url ?? '/categories',
  isActive: Boolean(row.is_active),
  sortOrder: Number(row.sort_order),
});

export const resolveCatalogUnitPrice = (variant: {
  variant_price?: number | string | null;
  sale_price?: number | string | null;
  base_price?: number | string | null;
}): number =>
  Number(variant.variant_price ?? variant.sale_price ?? variant.base_price ?? 0);

export const computeMarketingSalePrice = (
  basePrice: number,
  salePrice: number | null | undefined,
  discountPercent: number,
  catalogUnitPrice?: number,
): number => {
  const base = Number(basePrice) || 0;
  const sale =
    salePrice != null && Number.isFinite(Number(salePrice)) ? Number(salePrice) : null;
  const fromProduct = sale !== null && sale < base ? sale : base;
  const catalog = catalogUnitPrice && catalogUnitPrice > 0 ? catalogUnitPrice : fromProduct;
  const pct = Math.min(100, Math.max(0, Number(discountPercent)));
  return Math.round(catalog * (1 - pct / 100));
};

/** Unit price after marketing % (if any); otherwise catalog unit price. */
export const resolveMarketingUnitPriceForProduct = (
  productId: number,
  variant: {
    variant_price?: number | string | null;
    sale_price?: number | string | null;
    base_price?: number | string | null;
  },
  offers: Map<number, number>,
): number => {
  const catalogUnit = resolveCatalogUnitPrice(variant);
  const pct = offers.get(productId);
  if (pct == null) return catalogUnit;

  const basePrice = Number(variant.base_price ?? 0);
  const salePrice =
    variant.sale_price != null && Number.isFinite(Number(variant.sale_price))
      ? Number(variant.sale_price)
      : null;

  return computeMarketingSalePrice(basePrice, salePrice, pct, catalogUnit);
};

const parseDiscountPercent = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const pct = Number(value);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error('INVALID_DISCOUNT_PERCENT');
  return pct === 0 ? null : Math.round(pct * 100) / 100;
};

const mapProductPayload = (row: MarketingFlashSaleRow) => {
  const basePrice = Number(row.base_price ?? 0);
  const saleRaw = row.sale_price;
  const salePrice =
    saleRaw != null && Number.isFinite(Number(saleRaw)) ? Number(saleRaw) : null;
  const catalogPrice =
    salePrice !== null && Number.isFinite(salePrice) && salePrice < basePrice ? salePrice : basePrice;

  const discountPercent = parseDiscountPercent(row.discount_percent);
  const price =
    discountPercent != null
      ? computeMarketingSalePrice(basePrice, salePrice, discountPercent, catalogPrice)
      : catalogPrice;
  const displayBase = discountPercent != null ? catalogPrice : basePrice;
  const badgeLabel =
    row.badge_label?.trim() ||
    (discountPercent != null ? `-${Math.round(discountPercent)}%` : null);

  return {
    id: String(row.product_id),
    name: row.product_name ?? '',
    slug: row.product_slug ?? '',
    image: row.thumbnail_url ?? '',
    price,
    basePrice: displayBase > price ? displayBase : basePrice,
    brand: row.brand_name ?? '',
    category: row.category_name ?? '',
    badgeLabel,
    discountPercent,
  };
};

const mapFlashSaleItem = (row: MarketingFlashSaleRow) => ({
  id: Number(row.id),
  section: row.section,
  productId: Number(row.product_id),
  badgeLabel: row.badge_label,
  discountPercent: parseDiscountPercent(row.discount_percent),
  sortOrder: Number(row.sort_order),
  isActive: Boolean(row.is_active),
  endsAt: toIso(row.ends_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  product: row.product_name
    ? {
        id: Number(row.product_id),
        name: row.product_name,
        slug: row.product_slug ?? '',
        thumbnailUrl: row.thumbnail_url,
        basePrice: Number(row.base_price ?? 0),
        salePrice: row.sale_price == null ? null : Number(row.sale_price),
        brandName: row.brand_name ?? '',
        categoryName: row.category_name ?? '',
      }
    : null,
});

/** MySQL TIMESTAMP rejects ISO strings with `Z`; store `YYYY-MM-DD HH:mm:ss`. */
const toMySqlDateTime = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const localDateTimeMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(raw);
  if (localDateTimeMatch) {
    const seconds = localDateTimeMatch[3] ?? '00';
    return `${localDateTimeMatch[1]} ${localDateTimeMatch[2]}:${seconds}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error('INVALID_DATE');

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
};

const parseOptionalDate = (value: unknown): string | null => toMySqlDateTime(value);

const parseBannerInput = (body: Record<string, unknown>, partial = false) => {
  const patch: Partial<Parameters<typeof marketingRepository.createBanner>[0]> = {};

  if (!partial || body.placement !== undefined) {
    const placement = String(body.placement ?? 'HOME_HERO').trim();
    if (!isMarketingBannerPlacement(placement)) throw new Error('INVALID_PLACEMENT');
    patch.placement = placement;
  }

  if (!partial || body.title !== undefined) {
    patch.title = String(body.title ?? '').trim();
    if (!patch.title) throw new Error('MISSING_TITLE');
  }

  if (!partial || body.description !== undefined) {
    const description = body.description == null ? '' : String(body.description).trim();
    patch.description = description || null;
  }

  if (!partial || body.imageUrl !== undefined) {
    patch.imageUrl = String(body.imageUrl ?? '').trim();
    if (!patch.imageUrl) throw new Error('MISSING_IMAGE_URL');
  }

  if (!partial || body.linkUrl !== undefined) {
    patch.linkUrl = String(body.linkUrl ?? '/categories').trim() || '/categories';
  }

  if (!partial || body.ctaLabel !== undefined) {
    const cta = body.ctaLabel == null ? '' : String(body.ctaLabel).trim();
    patch.ctaLabel = cta || null;
  }

  if (!partial || body.sortOrder !== undefined) {
    patch.sortOrder = Number(body.sortOrder ?? 0);
  }

  if (!partial || body.isActive !== undefined) {
    patch.isActive = Boolean(body.isActive);
  }

  if (!partial || body.startsAt !== undefined) {
    patch.startsAt = parseOptionalDate(body.startsAt);
  }

  if (!partial || body.endsAt !== undefined) {
    patch.endsAt = parseOptionalDate(body.endsAt);
  }

  if (!partial) {
    if (!patch.placement) patch.placement = 'HOME_HERO';
    if (!patch.title) throw new Error('MISSING_TITLE');
    if (!patch.imageUrl) throw new Error('MISSING_IMAGE_URL');
    if (patch.linkUrl === undefined) patch.linkUrl = '/categories';
    if (patch.sortOrder === undefined) patch.sortOrder = 0;
    if (patch.isActive === undefined) patch.isActive = true;
    if (patch.description === undefined) patch.description = null;
    if (patch.ctaLabel === undefined) patch.ctaLabel = null;
    if (patch.startsAt === undefined) patch.startsAt = null;
    if (patch.endsAt === undefined) patch.endsAt = null;
  }

  return patch as Parameters<typeof marketingRepository.createBanner>[0];
};

const parseFlashSaleInput = (body: Record<string, unknown>, partial = false) => {
  const patch: Partial<{
    productId: number;
    badgeLabel: string | null;
    discountPercent: number | null;
    sortOrder: number;
    isActive: boolean;
    endsAt: string | null;
  }> = {};

  if (!partial || body.productId !== undefined) {
    patch.productId = Number(body.productId);
    if (!Number.isInteger(patch.productId) || patch.productId <= 0) {
      throw new Error('INVALID_PRODUCT_ID');
    }
  }

  if (!partial || body.badgeLabel !== undefined) {
    const label = body.badgeLabel == null ? '' : String(body.badgeLabel).trim();
    patch.badgeLabel = label || null;
  }

  if (!partial || body.discountPercent !== undefined) {
    patch.discountPercent = parseDiscountPercent(body.discountPercent);
  }

  if (!partial || body.sortOrder !== undefined) {
    patch.sortOrder = Number(body.sortOrder ?? 0);
  }

  if (!partial || body.isActive !== undefined) {
    patch.isActive = Boolean(body.isActive);
  }

  if (!partial || body.endsAt !== undefined) {
    patch.endsAt = parseOptionalDate(body.endsAt);
  }

  if (!partial) {
    if (!patch.productId) throw new Error('INVALID_PRODUCT_ID');
    if (patch.sortOrder === undefined) patch.sortOrder = 0;
    if (patch.isActive === undefined) patch.isActive = true;
    if (patch.badgeLabel === undefined) patch.badgeLabel = null;
    if (patch.discountPercent === undefined) patch.discountPercent = null;
    if (patch.endsAt === undefined) patch.endsAt = null;
  }

  return patch as {
    productId: number;
    badgeLabel: string | null;
    discountPercent: number | null;
    sortOrder: number;
    isActive: boolean;
    endsAt: string | null;
  };
};

export const marketingService = {
  async listBanners(query: Record<string, unknown>) {
    const placement = query.placement ? String(query.placement) : undefined;
    const isActive =
      query.isActive === undefined
        ? undefined
        : query.isActive === 'true' || query.isActive === true || query.isActive === '1';

    const rows = await marketingRepository.listBanners({ placement, isActive });
    return { items: rows.map(mapBanner) };
  },

  async createBanner(body: Record<string, unknown>) {
    const input = parseBannerInput(body, false);
    const row = await marketingRepository.createBanner(input);
    if (!row) throw new Error('BANNER_CREATE_FAILED');
    bumpPublicContentRevision();
    return mapBanner(row);
  },

  async updateBanner(id: number, body: Record<string, unknown>) {
    const existing = await marketingRepository.findBannerById(id);
    if (!existing) throw new Error('BANNER_NOT_FOUND');

    const patch = parseBannerInput(body, true);
    const row = await marketingRepository.updateBanner(id, patch);
    if (!row) throw new Error('BANNER_NOT_FOUND');
    bumpPublicContentRevision();
    return mapBanner(row);
  },

  async removeBanner(id: number) {
    const ok = await marketingRepository.removeBanner(id);
    if (!ok) throw new Error('BANNER_NOT_FOUND');
    bumpPublicContentRevision();
    return { id };
  },

  parseSectionCode(value: unknown): MarketingHomeSectionCode {
    const section = String(value ?? '').trim().toUpperCase();
    if (!isMarketingHomeSection(section)) throw new Error('INVALID_SECTION');
    return section;
  },

  async listHomeSections() {
    const rows = await marketingRepository.listHomeSections();
    return { items: rows.map(mapHomeSection) };
  },

  async updateHomeSection(code: MarketingHomeSectionCode, body: Record<string, unknown>) {
    const existing = await marketingRepository.findHomeSection(code);
    if (!existing) throw new Error('SECTION_NOT_FOUND');

    const row = await marketingRepository.updateHomeSection(code, {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      subtitle:
        body.subtitle !== undefined
          ? body.subtitle == null
            ? null
            : String(body.subtitle).trim() || null
          : undefined,
      badgeLabel:
        body.badgeLabel !== undefined
          ? body.badgeLabel == null
            ? null
            : String(body.badgeLabel).trim() || null
          : undefined,
      linkUrl: body.linkUrl !== undefined ? String(body.linkUrl).trim() || '/categories' : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    });

    if (!row) throw new Error('SECTION_NOT_FOUND');
    bumpPublicContentRevision();
    return mapHomeSection(row);
  },

  async listSectionProducts(section: MarketingHomeSectionCode, query: Record<string, unknown>) {
    const isActive =
      query.isActive === undefined
        ? undefined
        : query.isActive === 'true' || query.isActive === true || query.isActive === '1';

    const rows = await marketingRepository.listSectionProducts({ section, isActive });
    return { items: rows.map(mapFlashSaleItem) };
  },

  async createSectionProduct(section: MarketingHomeSectionCode, body: Record<string, unknown>) {
    const input = parseFlashSaleInput(body, false);

    const exists = await marketingRepository.productExists(input.productId);
    if (!exists) throw new Error('PRODUCT_NOT_FOUND');

    const duplicate = await marketingRepository.findSectionProductByProductId(section, input.productId);
    if (duplicate) throw new Error('SECTION_PRODUCT_EXISTS');

    const row = await marketingRepository.createSectionProduct({ section, ...input });
    if (!row) throw new Error('SECTION_PRODUCT_CREATE_FAILED');
    bumpPublicContentRevision();
    return mapFlashSaleItem(row);
  },

  async updateSectionProduct(id: number, body: Record<string, unknown>) {
    const existing = await marketingRepository.findSectionProductById(id);
    if (!existing) throw new Error('SECTION_PRODUCT_NOT_FOUND');

    const patch = parseFlashSaleInput(body, true);
    const section = existing.section as MarketingHomeSectionCode;

    if (patch.productId && patch.productId !== Number(existing.product_id)) {
      const exists = await marketingRepository.productExists(patch.productId);
      if (!exists) throw new Error('PRODUCT_NOT_FOUND');

      const duplicate = await marketingRepository.findSectionProductByProductId(section, patch.productId);
      if (duplicate && duplicate !== id) throw new Error('SECTION_PRODUCT_EXISTS');
    }

    const row = await marketingRepository.updateSectionProduct(id, patch);
    if (!row) throw new Error('SECTION_PRODUCT_NOT_FOUND');
    bumpPublicContentRevision();
    return mapFlashSaleItem(row);
  },

  async removeSectionProduct(id: number) {
    const ok = await marketingRepository.removeSectionProduct(id);
    if (!ok) throw new Error('SECTION_PRODUCT_NOT_FOUND');
    bumpPublicContentRevision();
    return { id };
  },

  async getPublicHome() {
    const sectionLimits: Record<MarketingHomeSectionCode, number> = {
      TOP_DEAL: 6,
      FLASH_SALE: 6,
      BEST_SELLER: 8,
      SUGGESTED: 15,
    };

    const [banners, sectionConfigs] = await Promise.all([
      marketingRepository.listActiveHeroBanners(),
      marketingRepository.listHomeSections(),
    ]);

    const activeSections = sectionConfigs.filter((row) => Number(row.is_active) === 1);

    const sectionBlocks = await Promise.all(
      activeSections.map(async (config) => {
        const code = config.code as MarketingHomeSectionCode;
        const products = await marketingRepository.listActiveSectionProducts(
          code,
          sectionLimits[code] ?? 6,
        );

        const endsAt = products
          .map((item) => item.ends_at)
          .filter(Boolean)
          .map((value) => new Date(value as string | Date).getTime())
          .sort((a, b) => a - b)[0];

        return {
          code,
          title: config.title,
          subtitle: config.subtitle,
          badgeLabel: config.badge_label,
          linkUrl: config.link_url ?? '/categories',
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          products: products.map(mapProductPayload),
        };
      }),
    );

    const sections = Object.fromEntries(sectionBlocks.map((block) => [block.code, block]));

    const flashSale = sections.FLASH_SALE ?? {
      code: 'FLASH_SALE',
      title: 'Flash Sale',
      subtitle: null,
      badgeLabel: null,
      linkUrl: '/categories',
      endsAt: null,
      products: [],
    };

    return {
      heroSlides: banners.map((banner) => ({
        id: Number(banner.id),
        src: banner.image_url,
        alt: banner.title,
        title: banner.title,
        desc: banner.description ?? '',
        ctaLabel: banner.cta_label ?? 'Xem ngay',
        to: banner.link_url,
      })),
      sections,
      flashSale: {
        endsAt: flashSale.endsAt,
        products: flashSale.products,
      },
    };
  },
};
