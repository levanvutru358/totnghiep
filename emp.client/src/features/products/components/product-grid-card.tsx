import { AspectRatio, Badge, Box, HStack, Image, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatProductPrice } from '../lib/product-price'

const fallbackImage = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'

export type ProductGridCardProps = {
  href: string
  name: string
  image: string
  displayPrice: number
  compareAtPrice?: number | null
  discountPercent?: number | null
  imageBadge?: string | null
  showFreeship?: boolean
  footer?: ReactNode
  borderRadius?: 'lg' | 'xl'
}

export const ProductGridCard = ({
  href,
  name,
  image,
  displayPrice,
  compareAtPrice = null,
  discountPercent = null,
  imageBadge = null,
  showFreeship = true,
  footer,
  borderRadius = 'lg',
}: ProductGridCardProps) => {
  const hasStrike = compareAtPrice != null && compareAtPrice > displayPrice
  const pct =
    discountPercent != null && discountPercent > 0
      ? discountPercent
      : hasStrike
        ? Math.round((1 - displayPrice / compareAtPrice) * 100)
        : null

  return (
    <Link to={href}>
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius={borderRadius}
        overflow="hidden"
        className="hover:shadow-sm transition"
        position="relative"
        h="100%"
      >
        {imageBadge ? (
          <Badge position="absolute" top={2} left={2} zIndex={1} colorScheme="red" fontSize="10px">
            {imageBadge}
          </Badge>
        ) : null}
        <AspectRatio ratio={1}>
          <Image src={image || fallbackImage} alt={name} objectFit="cover" />
        </AspectRatio>
        <Box p={3}>
          <Text fontSize="sm" fontWeight="700" noOfLines={2} minH="2.5em">
            {name}
          </Text>
          <HStack spacing={2} mt={1} flexWrap="wrap" align="center">
            <Text fontSize="sm" color="brand.700" fontWeight="800">
              {formatProductPrice(displayPrice)}
            </Text>
            {hasStrike ? (
              <Text fontSize="xs" color="text.secondary" textDecoration="line-through">
                {formatProductPrice(compareAtPrice)}
              </Text>
            ) : null}
            {pct != null && pct > 0 ? (
              <Badge
                bg="#ffe8f0"
                color="#c41e3a"
                fontSize="10px"
                fontWeight="800"
                borderRadius="sm"
                px={1.5}
              >
                -{pct}%
              </Badge>
            ) : null}
          </HStack>
          {showFreeship ? (
            <HStack mt={1.5} spacing={2}>
              <Badge colorScheme="green" variant="subtle" fontSize="10px" borderRadius="sm">
                FREESHIP
              </Badge>
            </HStack>
          ) : null}
          {footer ? <Box mt={1.5}>{footer}</Box> : null}
        </Box>
      </Box>
    </Link>
  )
}
