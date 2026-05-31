import { Image, type ImageProps } from '@chakra-ui/react'
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from '../../lib/brand'
import { useShopSettings } from '../../features/settings/context/shop-settings-context'
import { resolveShopLogoUrl } from '../../features/products/lib/product-image-url'

type BrandLogoProps = Omit<ImageProps, 'src' | 'alt'> & {
  alt?: string
}

export const BrandLogo = ({
  alt,
  objectFit = 'contain',
  objectPosition = 'center',
  ...props
}: BrandLogoProps) => {
  const { settings } = useShopSettings()
  const src = resolveShopLogoUrl(settings.logoUrl || BRAND_LOGO_SRC)
  const label = alt ?? settings.shopName ?? BRAND_LOGO_ALT

  return (
    <Image src={src} alt={label} objectFit={objectFit} objectPosition={objectPosition} {...props} />
  )
}
