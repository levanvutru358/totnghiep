import { StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Input,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { commerceApi } from '../../commerce/services/commerce.api'
import { useAuthModal } from '../../auth/context/auth-modal-context'
import { LikeToggleButton } from '../../../shared/components/like-toggle-button'
import { resolveReviewImageUrl } from '../lib/review-image-url'
import { reviewsApi, type ProductReview, type ReviewSort } from '../services/reviews.api'

const ReviewImageGallery = ({ images }: { images: ProductReview['images'] }) => {
  if (!images.length) return null
  return (
    <HStack mt={3} flexWrap="wrap" gap={2} align="flex-start">
      {images.map((img) => (
        <Box
          key={img.id}
          as="a"
          href={resolveReviewImageUrl(img.url)}
          target="_blank"
          rel="noopener noreferrer"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
          borderColor="border.subtle"
          _hover={{ opacity: 0.9 }}
        >
          <Box
            as="img"
            src={resolveReviewImageUrl(img.url)}
            alt="Ảnh đánh giá"
            h="96px"
            w="96px"
            objectFit="cover"
            loading="lazy"
          />
        </Box>
      ))}
    </HStack>
  )
}

const StarRow = ({ value }: { value: number }) => (
  <HStack spacing={0.5}>
    {[1, 2, 3, 4, 5].map((star) => (
      <StarIcon key={star} boxSize={4} color={star <= value ? 'orange.400' : 'gray.200'} />
    ))}
  </HStack>
)

const InteractiveStars = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <HStack spacing={1}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Box key={star} as="button" type="button" onClick={() => onChange(star)} cursor="pointer">
        <StarIcon boxSize={7} color={star <= value ? 'orange.400' : 'gray.300'} />
      </Box>
    ))}
  </HStack>
)

const isReviewAlreadyExists = (err: unknown) => {
  const message = err instanceof Error ? err.message : ''
  return message === 'REVIEW_ALREADY_EXISTS' || /already exists/i.test(message)
}

const getReviewErrorMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : ''
  return message || 'Gửi thất bại'
}

type Props = { productId: number }

export const ProductReviewsPanel = ({ productId }: Props) => {
  const { openAuthModal } = useAuthModal()
  const [page, setPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<number | ''>('')
  const [sort, setSort] = useState<ReviewSort>('newest')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [hasImageOnly, setHasImageOnly] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [formPreviewUrls, setFormPreviewUrls] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof reviewsApi.getStatistics>> | null>(null)
  const [list, setList] = useState<Awaited<ReturnType<typeof reviewsApi.listByProduct>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [likingReviewId, setLikingReviewId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([
        reviewsApi.getStatistics(productId),
        reviewsApi.listByProduct(productId, {
          page,
          limit: 10,
          sort,
          rating: ratingFilter === '' ? undefined : ratingFilter,
          verified: verifiedOnly,
          hasImage: hasImageOnly,
        }),
      ])
      setStats(s)
      setList(l)
    } catch {
      setStats(null)
      setList(null)
    } finally {
      setLoading(false)
    }
  }, [productId, page, ratingFilter, sort, verifiedOnly, hasImageOnly])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const urls = formFiles.map((file) => URL.createObjectURL(file))
    setFormPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [formFiles])

  const breakdownRows = useMemo(() => {
    if (!stats) return []
    return ([5, 4, 3, 2, 1] as const).map((star) => ({
      star,
      count: stats.star[star] ?? 0,
      pct: stats.total > 0 ? Math.round((stats.star[star] / stats.total) * 100) : 0,
    }))
  }, [stats])

  const mergeReview = (fresh: ProductReview) => {
    setList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((row) => (row.id === fresh.id ? fresh : row)),
      }
    })
  }

  const toggleReviewLike = async (review: ProductReview) => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    if (likingReviewId === review.id) return

    setLikingReviewId(review.id)
    try {
      const fresh = review.liked ? await reviewsApi.unlike(review.id) : await reviewsApi.like(review.id)
      mergeReview(fresh)
    } catch {
      // ignore
    } finally {
      setLikingReviewId(null)
    }
  }

  const prependReview = (review: ProductReview) => {
    setList((prev) => {
      const rest = (prev?.items ?? []).filter((item) => item.id !== review.id)
      const items = [review, ...rest]
      return {
        items,
        total: Math.max(prev?.total ?? 0, items.length),
        page: 1,
        totalPages: prev?.totalPages ?? 1,
      }
    })
    setPage(1)
  }

  const handleSubmit = async () => {
    if (!commerceApi.hasServerToken()) {
      openAuthModal()
      return
    }
    if (formContent.trim().length < 3) {
      setFormError('Nội dung tối thiểu 3 ký tự')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      let imageIds: number[] = []
      if (formFiles.length) {
        const uploaded = await reviewsApi.uploadImages(formFiles)
        imageIds = uploaded.map((i) => i.id)
      }
      const payload = {
        productId,
        rating: formRating,
        title: formTitle.trim() || undefined,
        content: formContent.trim(),
        images: imageIds.length ? imageIds : undefined,
      }

      let saved: ProductReview
      try {
        saved = await reviewsApi.create(payload)
      } catch (err) {
        if (!isReviewAlreadyExists(err)) throw err
        const mine = await reviewsApi.listMine({ page: 1, limit: 50 })
        const existing = mine.items.find((row) => row.productId === productId)
        if (!existing) throw err
        saved = await reviewsApi.update(existing.id, {
          rating: payload.rating,
          title: payload.title,
          content: payload.content,
          images: payload.images,
        })
      }

      prependReview(saved)
      setFormTitle('')
      setFormContent('')
      setFormFiles([])
      void reviewsApi.getStatistics(productId).then(setStats)
    } catch (err) {
      setFormError(getReviewErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !stats) {
    return (
      <HStack justify="center" py={8}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="text.secondary">
          Đang tải đánh giá...
        </Text>
      </HStack>
    )
  }

  return (
    <VStack align="stretch" spacing={6}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Box>
          <HStack align="baseline" spacing={2}>
            <Text fontSize="3xl" fontWeight="900">
              {(stats?.average ?? 0).toFixed(1)}
            </Text>
            <Text color="text.secondary">/ 5</Text>
          </HStack>
          <StarRow value={Math.round(stats?.average ?? 0)} />
          <Text fontSize="sm" color="text.secondary" mt={1}>
            {stats?.total ?? 0} đánh giá
          </Text>
          <VStack align="stretch" mt={4} spacing={2}>
            {breakdownRows.map((row) => (
              <HStack key={row.star} spacing={2}>
                <Text fontSize="xs" w="52px">
                  {row.star} sao
                </Text>
                <Progress flex={1} value={row.pct} size="xs" colorScheme="orange" borderRadius="full" />
                <Text fontSize="xs" w="32px" textAlign="right">
                  {row.count}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4} borderColor="border.subtle">
          <Text fontWeight="700" mb={3}>
            Viết đánh giá
          </Text>
          <InteractiveStars value={formRating} onChange={setFormRating} />
          <Input mt={3} size="sm" placeholder="Tiêu đề (tùy chọn)" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          <Textarea
            mt={2}
            size="sm"
            placeholder="Nội dung đánh giá..."
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            rows={4}
          />
          <Input mt={2} type="file" accept="image/*" multiple size="sm" onChange={(e) => setFormFiles(Array.from(e.target.files ?? []))} />
          {formPreviewUrls.length > 0 && (
            <HStack mt={2} flexWrap="wrap" gap={2}>
              {formPreviewUrls.map((url, index) => (
                <Box key={url} borderWidth="1px" borderRadius="md" overflow="hidden" borderColor="border.subtle">
                  <Box as="img" src={url} alt={`Xem trước ${index + 1}`} h="80px" w="80px" objectFit="cover" />
                </Box>
              ))}
            </HStack>
          )}
          {formError && (
            <Text fontSize="sm" color="red.500" mt={2}>
              {formError}
            </Text>
          )}
          <Button mt={3} size="sm" colorScheme="pink" bg="brand.600" isLoading={submitting} onClick={() => void handleSubmit()}>
            Gửi đánh giá
          </Button>
        </Box>
      </SimpleGrid>

      <HStack flexWrap="wrap" gap={3}>
        <Select size="sm" w="140px" bg="white" value={ratingFilter === '' ? '' : String(ratingFilter)} onChange={(e) => { setRatingFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}>
          <option value="">Tất cả sao</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} sao</option>
          ))}
        </Select>
        <Select size="sm" w="160px" bg="white" value={sort} onChange={(e) => { setSort(e.target.value as ReviewSort); setPage(1) }}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="rating_high">Cao → thấp</option>
          <option value="rating_low">Thấp → cao</option>
        </Select>
        <Button size="sm" variant={verifiedOnly ? 'solid' : 'outline'} onClick={() => { setVerifiedOnly((v) => !v); setPage(1) }}>
          Đã mua
        </Button>
        <Button size="sm" variant={hasImageOnly ? 'solid' : 'outline'} onClick={() => { setHasImageOnly((v) => !v); setPage(1) }}>
          Có ảnh
        </Button>
      </HStack>

      <VStack align="stretch" spacing={3}>
        {(list?.items ?? []).map((review) => (
          <Box key={review.id} borderWidth="1px" borderRadius="lg" p={4}>
            <HStack justify="space-between" mb={1}>
              <Text fontWeight="700" fontSize="sm">{review.userName}</Text>
              {review.verified && (
                <Text fontSize="xs" color="green.600">Đã mua hàng</Text>
              )}
            </HStack>
            {review.title && <Text fontWeight="600" fontSize="sm">{review.title}</Text>}
            <StarRow value={review.rating} />
            <Text fontSize="sm" mt={2}>{review.content}</Text>
            <ReviewImageGallery images={review.images} />
            <HStack mt={2} spacing={3} flexWrap="wrap">
              <Text fontSize="xs" color="text.secondary">
                {new Date(review.createdAt).toLocaleString('vi-VN')}
              </Text>
              <LikeToggleButton
                liked={review.liked}
                likeCount={review.likeCount}
                isLoading={likingReviewId === review.id}
                onClick={() => void toggleReviewLike(review)}
              />
            </HStack>
          </Box>
        ))}
        {!loading && (list?.items.length ?? 0) === 0 && (
          <Text fontSize="sm" color="text.secondary">Chưa có đánh giá được duyệt.</Text>
        )}
      </VStack>

      {list && list.totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <Text fontSize="sm">{page} / {list.totalPages}</Text>
          <Button size="sm" variant="outline" isDisabled={page >= list.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </HStack>
      )}
    </VStack>
  )
}
