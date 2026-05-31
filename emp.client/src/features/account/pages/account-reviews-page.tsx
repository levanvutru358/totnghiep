import { StarIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Image,
  Input,
  Select,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { commerceApi } from '../../commerce/services/commerce.api'
import { resolveReviewImageUrl } from '../../reviews/lib/review-image-url'
import { reviewsApi, type ProductReview } from '../../reviews/services/reviews.api'

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ hiển thị',
  APPROVED: 'Hiển thị',
  REJECTED: 'Từ chối',
  HIDDEN: 'Đã ẩn',
}

const statusColor: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  HIDDEN: 'gray',
}

const cardSx = {
  bg: 'surface.card',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  borderRadius: 'xl',
  overflow: 'hidden',
}

const StarRow = ({ value, size = 5 }: { value: number; size?: number }) => (
  <HStack spacing={1}>
    {[1, 2, 3, 4, 5].map((star) => (
      <StarIcon key={star} boxSize={size} color={star <= value ? 'orange.400' : 'gray.200'} />
    ))}
  </HStack>
)

const ReviewImages = ({
  images,
  maxH = '120px',
  onDeleteImage,
  deleting,
}: {
  images: ProductReview['images']
  maxH?: string
  onDeleteImage?: (imageId: number) => void
  deleting?: boolean
}) => {
  if (!images.length) return null
  return (
    <HStack flexWrap="wrap" gap={3} align="flex-start">
      {images.map((img) => (
        <Box key={img.id} position="relative" borderRadius="lg" overflow="hidden" borderWidth="1px" borderColor="border.subtle">
          <Image
            src={resolveReviewImageUrl(img.url)}
            alt="Ảnh đánh giá"
            objectFit="cover"
            w={{ base: '100px', md: '120px' }}
            h={{ base: '100px', md: '120px' }}
            maxH={maxH}
          />
          {onDeleteImage ? (
            <Button
              size="xs"
              colorScheme="red"
              position="absolute"
              top={2}
              right={2}
              isLoading={deleting}
              onClick={() => onDeleteImage(img.id)}
            >
              Xóa ảnh
            </Button>
          ) : null}
        </Box>
      ))}
    </HStack>
  )
}

export const AccountReviewsPage = () => {
  const [items, setItems] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editRating, setEditRating] = useState(5)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!commerceApi.hasServerToken()) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await reviewsApi.listMine({ page: 1, limit: 50 })
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const startEdit = (review: ProductReview) => {
    setEditId(review.id)
    setEditRating(review.rating)
    setEditTitle(review.title ?? '')
    setEditContent(review.content)
    setEditFiles([])
    setError('')
  }

  const saveEdit = async (reviewId: number) => {
    const content = editContent.trim()
    if (content.length < 3) {
      setError('Nội dung đánh giá tối thiểu 3 ký tự.')
      return
    }
    setActionLoadingId(reviewId)
    setError('')
    try {
      let imageIds: number[] = []
      if (editFiles.length) {
        const uploaded = await reviewsApi.uploadImages(editFiles)
        imageIds = uploaded.map((i) => i.id)
      }
      const updated = await reviewsApi.update(reviewId, {
        rating: editRating,
        title: editTitle.trim() || undefined,
        content,
        images: imageIds.length ? imageIds : undefined,
      })
      setItems((prev) => prev.map((r) => (r.id === reviewId ? updated : r)))
      setEditId(null)
      setEditFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật đánh giá thất bại.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteReview = async (reviewId: number) => {
    if (!window.confirm('Xóa đánh giá này?')) return
    setActionLoadingId(reviewId)
    setError('')
    try {
      await reviewsApi.remove(reviewId)
      setItems((prev) => prev.filter((r) => r.id !== reviewId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa đánh giá thất bại.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteImage = async (reviewId: number, imageId: number) => {
    if (!window.confirm('Xóa ảnh này khỏi đánh giá?')) return
    setActionLoadingId(reviewId)
    setError('')
    try {
      await reviewsApi.deleteImage(reviewId, imageId)
      setItems((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, images: r.images.filter((img) => img.id !== imageId) } : r,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa ảnh thất bại.')
    } finally {
      setActionLoadingId(null)
    }
  }

  if (!commerceApi.hasServerToken()) {
    return (
      <LoginRequiredPrompt
        description="Đăng nhập để xem đánh giá bạn đã gửi."
        onSuccess={() => void load()}
      />
    )
  }

  return (
    <VStack align="stretch" spacing={6} maxW="container.lg" w="full" mx="auto" px={{ base: 0, md: 2 }}>
      <Box>
        <Heading size={{ base: 'lg', md: 'xl' }} fontWeight="800" mb={2}>
          Đánh giá của tôi
        </Heading>
        <Text fontSize="md" color="text.secondary">
          <Link to={ROUTES.ACCOUNT_PROFILE}>← Quay lại tài khoản</Link>
        </Text>
      </Box>

      {error ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="lg" px={4} py={3}>
          <Text fontSize="sm" color="red.600">
            {error}
          </Text>
        </Box>
      ) : null}

      {loading ? (
        <Box {...cardSx} py={12}>
          <HStack justify="center" spacing={3}>
            <Spinner size="md" color="brand.500" />
            <Text fontSize="md" color="text.secondary">
              Đang tải đánh giá...
            </Text>
          </HStack>
        </Box>
      ) : null}

      {!loading && items.length === 0 ? (
        <Box {...cardSx} p={{ base: 6, md: 10 }} textAlign="center">
          <Text fontSize="md" color="text.secondary" mb={4}>
            Bạn chưa gửi đánh giá nào.
          </Text>
          <Button as={Link} to={ROUTES.CATEGORIES} size="md" colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
            Mua sắm và đánh giá
          </Button>
        </Box>
      ) : null}

      {items.map((r) => {
        const isEditing = editId === r.id
        const thumb = r.images[0]

        return (
          <Box key={r.id} {...cardSx} p={{ base: 5, md: 6 }}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap={{ base: 4, md: 6 }}
              align={{ base: 'stretch', md: 'flex-start' }}
            >
              {thumb && !isEditing ? (
                <Box flexShrink={0} alignSelf={{ base: 'center', md: 'flex-start' }}>
                  <Image
                    src={resolveReviewImageUrl(thumb.url)}
                    alt={r.productName ?? 'Sản phẩm'}
                    borderRadius="xl"
                    objectFit="cover"
                    w={{ base: '140px', md: '160px' }}
                    h={{ base: '140px', md: '160px' }}
                    borderWidth="1px"
                    borderColor="border.subtle"
                  />
                </Box>
              ) : null}

              <VStack align="stretch" flex={1} spacing={3} minW={0}>
                <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
                  <Text fontWeight="800" fontSize={{ base: 'lg', md: 'xl' }} noOfLines={2}>
                    {r.productName ?? `Sản phẩm #${r.productId}`}
                  </Text>
                  {r.status ? (
                    <Badge
                      colorScheme={statusColor[r.status] ?? 'gray'}
                      fontSize="sm"
                      px={3}
                      py={1}
                      borderRadius="md"
                      textTransform="uppercase"
                    >
                      {statusLabel[r.status] ?? r.status}
                    </Badge>
                  ) : null}
                </Flex>

                {isEditing ? (
                  <VStack align="stretch" spacing={4} pt={1}>
                    <FormControl>
                      <FormLabel fontSize="md" fontWeight="600">
                        Số sao
                      </FormLabel>
                      <Select size="md" value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>
                        {[5, 4, 3, 2, 1].map((s) => (
                          <option key={s} value={s}>
                            {s} sao
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="md" fontWeight="600">
                        Tiêu đề (tùy chọn)
                      </FormLabel>
                      <Input
                        size="md"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Tiêu đề ngắn"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="md" fontWeight="600">
                        Nội dung
                      </FormLabel>
                      <Textarea size="md" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="md" fontWeight="600">
                        Thêm ảnh
                      </FormLabel>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        size="md"
                        py={1}
                        onChange={(e) => setEditFiles(Array.from(e.target.files ?? []))}
                      />
                      {editFiles.length > 0 ? (
                        <Text fontSize="sm" color="text.secondary" mt={1}>
                          {editFiles.length} ảnh mới sẽ được thêm khi lưu
                        </Text>
                      ) : null}
                    </FormControl>

                    {r.images.length > 0 ? (
                      <ReviewImages
                        images={r.images}
                        onDeleteImage={(imageId) => void deleteImage(r.id, imageId)}
                        deleting={actionLoadingId === r.id}
                      />
                    ) : null}

                    <HStack spacing={3} pt={1}>
                      <Button
                        size="md"
                        height="48px"
                        px={8}
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                        isLoading={actionLoadingId === r.id}
                        onClick={() => void saveEdit(r.id)}
                      >
                        Lưu thay đổi
                      </Button>
                      <Button size="md" height="48px" variant="outline" borderColor="border.muted" onClick={() => setEditId(null)}>
                        Hủy
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <>
                    <StarRow value={r.rating} size={6} />
                    {r.title ? (
                      <Text fontWeight="700" fontSize="lg">
                        {r.title}
                      </Text>
                    ) : null}
                    <Text fontSize="md" lineHeight="tall" color="text.primary">
                      {r.content}
                    </Text>
                    {r.images.length > 1 ? <ReviewImages images={r.images.slice(1)} /> : null}
                    <Text fontSize="sm" color="text.secondary">
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </Text>
                    <HStack spacing={3} pt={2}>
                      <Button size="md" variant="outline" borderColor="border.muted" onClick={() => startEdit(r)}>
                        Sửa
                      </Button>
                      <Button
                        size="md"
                        variant="outline"
                        colorScheme="red"
                        isLoading={actionLoadingId === r.id}
                        onClick={() => void deleteReview(r.id)}
                      >
                        Xóa
                      </Button>
                    </HStack>
                  </>
                )}
              </VStack>
            </Flex>
          </Box>
        )
      })}
    </VStack>
  )
}
