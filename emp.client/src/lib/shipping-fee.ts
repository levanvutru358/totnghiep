export type ShippingFeeConfig = {
  defaultShippingFee: number
  freeShippingMinSubtotal: number
}

export const DEFAULT_SHIPPING_CONFIG: ShippingFeeConfig = {
  defaultShippingFee: 12,
  freeShippingMinSubtotal: 200,
}

export const computeShippingFee = (
  subtotalCatalog: number,
  config: ShippingFeeConfig = DEFAULT_SHIPPING_CONFIG,
): number => {
  if (subtotalCatalog <= 0) return 0
  if (
    config.freeShippingMinSubtotal > 0 &&
    subtotalCatalog >= config.freeShippingMinSubtotal
  ) {
    return 0
  }
  return config.defaultShippingFee
}
