import { Image, type ImageProps } from '@chakra-ui/react'
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from '../../lib/brand'

type BrandLogoProps = Omit<ImageProps, 'src' | 'alt'> & {
  alt?: string
}

export const BrandLogo = ({
  alt = BRAND_LOGO_ALT,
  objectFit = 'contain',
  objectPosition = 'center',
  ...props
}: BrandLogoProps) => (
  <Image src={BRAND_LOGO_SRC} alt={alt} objectFit={objectFit} objectPosition={objectPosition} {...props} />
)
