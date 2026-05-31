export const marketingBannerPlacements = ['HOME_HERO'] as const;

export type MarketingBannerPlacement = (typeof marketingBannerPlacements)[number];

export const isMarketingBannerPlacement = (value: string): value is MarketingBannerPlacement =>
  marketingBannerPlacements.includes(value as MarketingBannerPlacement);

export const marketingHomeSections = ['TOP_DEAL', 'FLASH_SALE', 'BEST_SELLER', 'SUGGESTED'] as const;

export type MarketingHomeSectionCode = (typeof marketingHomeSections)[number];

export const isMarketingHomeSection = (value: string): value is MarketingHomeSectionCode =>
  marketingHomeSections.includes(value as MarketingHomeSectionCode);
