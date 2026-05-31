import { Badge, Box, Heading, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import type { MarketingHomeProduct, MarketingHomeSectionBlock } from '../../marketing/services/marketing.api'
import { buildProductDetailHref } from '../../products/utils/product-url'
import { HomeProductCard } from './home-product-card'

type HomeProductSectionProps = {
  block: MarketingHomeSectionBlock | undefined
  fallbackTitle: string
  fallbackSubtitle?: string
  fallbackBadge?: string
  fallbackLink: string
  products: MarketingHomeProduct[]
  columns: { base: number; md: number; lg: number }
  showDiscountBadge?: boolean
}

export const HomeProductSection = ({
  block,
  fallbackTitle,
  fallbackSubtitle,
  fallbackBadge,
  fallbackLink,
  products,
  columns,
  showDiscountBadge,
}: HomeProductSectionProps) => {
  if (products.length === 0) return null

  const title = block?.title || fallbackTitle
  const subtitle = block?.subtitle || fallbackSubtitle
  const badgeLabel = block?.badgeLabel || fallbackBadge
  const linkTo = block?.linkUrl || fallbackLink

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
      <HStack justify="space-between" mb={3} align="start" flexWrap="wrap" gap={2}>
        <Box>
          <HStack spacing={2}>
            <Heading size="md">{title}</Heading>
            {badgeLabel ? (
              <Badge colorScheme="red" borderRadius="full" px={3} py={1}>
                {badgeLabel}
              </Badge>
            ) : null}
          </HStack>
          {subtitle ? (
            <Text fontSize="sm" color="text.secondary" mt={1}>
              {subtitle}
            </Text>
          ) : null}
        </Box>
        <Text
          as={Link}
          to={linkTo}
          fontSize="sm"
          color="text.secondary"
          className="hover:text-gray-900"
          whiteSpace="nowrap"
        >
          Xem tất cả
        </Text>
      </HStack>
      <SimpleGrid columns={columns} spacing={3}>
        {products.map((product, idx) => {
          const original = product.basePrice
          const hasRealDiscount = original > product.price
          const discount =
            product.discountPercent != null
              ? Math.round(product.discountPercent)
              : showDiscountBadge && hasRealDiscount
                ? Math.round((1 - product.price / original) * 100)
                : undefined

          return (
            <HomeProductCard
              key={`${product.id}-${idx}`}
              product={product}
              href={buildProductDetailHref(product.id, product.name, product.slug)}
              discountPercent={discount}
            />
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
