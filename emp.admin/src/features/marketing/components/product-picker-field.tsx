import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { SearchIcon } from '@chakra-ui/icons'
import { useMemo, useState } from 'react'
import { formatProductPrice } from '../../../lib/product-price'
import { useProducts } from '../../products/hooks/use-products'
import { resolveMediaUrl } from '../../products/lib/media-url'

type ProductPickerFieldProps = {
  value: number | ''
  onChange: (productId: number | '') => void
  excludeProductIds?: number[]
  /** Khóa đổi sản phẩm (khi sửa) */
  lockSelection?: boolean
  selectedLabel?: string
}

export const ProductPickerField = ({
  value,
  onChange,
  excludeProductIds = [],
  lockSelection = false,
  selectedLabel,
}: ProductPickerFieldProps) => {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useProducts({
    search: search.trim() || undefined,
    limit: 40,
    status: 'active',
  })

  const excludeSet = useMemo(() => new Set(excludeProductIds.map(Number)), [excludeProductIds])

  const options = useMemo(() => {
    const products = data?.products ?? []
    return products.filter((product) => !excludeSet.has(Number(product.id)))
  }, [data?.products, excludeSet])

  const selectedFromList = options.find((product) => Number(product.id) === Number(value))

  return (
    <FormControl isRequired>
      <FormLabel>Sản phẩm</FormLabel>
      {value !== '' ? (
        <Box
          borderWidth="1px"
          borderRadius="md"
          p={3}
          mb={3}
          bg="pink.50"
          borderColor="pink.200"
        >
          <Text fontWeight="700" fontSize="sm">
            {selectedLabel ?? selectedFromList?.name ?? `Sản phẩm #${value}`}
          </Text>
          <Text fontSize="xs" color="text.secondary" mt={0.5}>
            ID {value}
            {selectedFromList?.brand ? ` · ${selectedFromList.brand}` : ''}
          </Text>
          {!lockSelection ? (
            <Text
              as="button"
              type="button"
              fontSize="xs"
              color="pink.600"
              mt={2}
              fontWeight="600"
              onClick={() => onChange('')}
            >
              Chọn sản phẩm khác
            </Text>
          ) : null}
        </Box>
      ) : null}

      {!lockSelection && value === '' ? (
        <>
          <InputGroup size="sm" mb={2}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Tìm theo tên sản phẩm, thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          <Box
            borderWidth="1px"
            borderRadius="md"
            maxH="220px"
            overflowY="auto"
            bg="white"
          >
            {isLoading ? (
              <HStack justify="center" py={6}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="text.secondary">
                  Đang tải...
                </Text>
              </HStack>
            ) : options.length === 0 ? (
              <Text fontSize="sm" color="text.secondary" p={4} textAlign="center">
                {search.trim() ? 'Không tìm thấy sản phẩm.' : 'Gõ tên để tìm hoặc cuộn danh sách.'}
              </Text>
            ) : (
              <VStack align="stretch" spacing={0} divider={<Box borderColor="gray.100" borderBottomWidth="1px" />}>
                {options.map((product) => (
                  <HStack
                    key={product.id}
                    as="button"
                    type="button"
                    w="full"
                    textAlign="left"
                    px={3}
                    py={2}
                    spacing={3}
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => {
                      onChange(Number(product.id))
                      setSearch('')
                    }}
                  >
                    {product.image ? (
                      <Image
                        src={resolveMediaUrl(product.image)}
                        alt={product.name}
                        boxSize="40px"
                        borderRadius="md"
                        objectFit="cover"
                        flexShrink={0}
                      />
                    ) : (
                      <Box boxSize="40px" bg="gray.100" borderRadius="md" flexShrink={0} />
                    )}
                    <Box flex="1" minW={0}>
                      <Text fontWeight="600" fontSize="sm" noOfLines={1}>
                        {product.name}
                      </Text>
                      <Text fontSize="xs" color="text.secondary" noOfLines={1}>
                        ID {product.id} · {product.brand} · {formatProductPrice(product.price)}
                      </Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </>
      ) : null}
    </FormControl>
  )
}
