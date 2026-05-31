import { Box, HStack } from '@chakra-ui/react'
import { resolveReviewImageUrl } from '../../reviews/lib/review-image-url'

type CommentImage = { id: number; url: string }

export const CommentImageGallery = ({ images }: { images: CommentImage[] }) => {
  if (!images.length) return null
  return (
    <HStack mt={2} flexWrap="wrap" gap={2} align="flex-start">
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
            alt="Ảnh bình luận"
            h="80px"
            w="80px"
            objectFit="cover"
            loading="lazy"
          />
        </Box>
      ))}
    </HStack>
  )
}
