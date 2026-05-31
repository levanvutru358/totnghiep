import { Badge, Text } from '@chakra-ui/react'
import type { MarketingHomeProduct } from '../../marketing/services/marketing.api'
import { ProductGridCard } from '../../products/components/product-grid-card'

type HomeProductCardProps = {
  product: MarketingHomeProduct
  href: string
  discountPercent?: number
  rank?: number
  extraBadge?: string
}

export const HomeProductCard = ({
  product,
  href,
  discountPercent,
  rank,
  extraBadge,
}: HomeProductCardProps) => {
  const hasDiscount = product.basePrice > product.price
  const pct =
    discountPercent != null
      ? discountPercent
      : hasDiscount
        ? Math.round((1 - product.price / product.basePrice) * 100)
        : null

  const footer = (
    <>
      {typeof rank === 'number' ? (
        <Badge colorScheme="purple" variant="subtle" fontSize="10px" mb={1}>
          #{rank}
        </Badge>
      ) : null}
      {extraBadge && extraBadge.toLowerCase() !== 'freeship' ? (
        <Badge colorScheme="green" variant="subtle" fontSize="10px" mb={1} mr={1}>
          {extraBadge}
        </Badge>
      ) : null}
      <Text fontSize="xs" color="text.secondary" noOfLines={1}>
        {product.brand}
      </Text>
    </>
  )

  return (
    <ProductGridCard
      href={href}
      name={product.name}
      image={product.image}
      displayPrice={product.price}
      compareAtPrice={hasDiscount ? product.basePrice : null}
      discountPercent={pct}
      imageBadge={product.badgeLabel ?? (pct != null && pct > 0 ? `-${pct}%` : null)}
      showFreeship
      footer={footer}
    />
  )
}
