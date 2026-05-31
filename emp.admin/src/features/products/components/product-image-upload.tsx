import React, { useCallback, useRef, useState } from 'react'
import { Box, HStack, IconButton, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { CloseIcon } from '@chakra-ui/icons'
import { toast } from 'react-hot-toast'
import { AppButton } from '../../../components/ui/app-button'
import { resolveMediaUrl } from '../lib/media-url'
import { uploadApi } from '../services/upload.api'

const MAX_IMAGES = 10
const MAX_FILE_SIZE_MB = 5

export type ProductImageItem =
  | { kind: 'url'; value: string }
  | { kind: 'file'; value: string; file: File }
  | { kind: 'uploading'; value: string }

interface ProductImagesUploadProps {
  items: ProductImageItem[]
  onChange: React.Dispatch<React.SetStateAction<ProductImageItem[]>>
  className?: string
}

const isImageFile = (file: File) => file.type.startsWith('image/')

export const ProductImagesUpload: React.FC<ProductImagesUploadProps> = ({
  items,
  onChange,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [linkDraft, setLinkDraft] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const canAddMore = items.length < MAX_IMAGES

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      const validFiles = files.filter((file) => {
        if (!isImageFile(file)) {
          toast.error(`${file.name}: không phải file ảnh`)
          return false
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.error(`${file.name}: vượt quá ${MAX_FILE_SIZE_MB}MB`)
          return false
        }
        return true
      })

      const slotsLeft = MAX_IMAGES - items.length
      const toUpload = validFiles.slice(0, slotsLeft)
      if (toUpload.length === 0) {
        if (validFiles.length > 0) toast.error(`Tối đa ${MAX_IMAGES} ảnh mỗi sản phẩm`)
        return
      }
      if (validFiles.length > slotsLeft) {
        toast.error(`Chỉ thêm được ${slotsLeft} ảnh nữa (tối đa ${MAX_IMAGES})`)
      }

      const placeholders: ProductImageItem[] = toUpload.map((file) => ({
        kind: 'uploading',
        value: URL.createObjectURL(file),
      }))
      const startIndex = items.length
      onChange([...items, ...placeholders])

      setIsUploading(true)
      try {
        const urls = await uploadApi.uploadImages(toUpload)
        if (urls.length === 0) {
          throw new Error('Không nhận được URL ảnh từ máy chủ')
        }

        onChange((prev) => {
          const next = [...prev]
          urls.forEach((url, index) => {
            const targetIndex = startIndex + index
            if (targetIndex < next.length) {
              next[targetIndex] = { kind: 'url', value: url }
            } else {
              next.push({ kind: 'url', value: url })
            }
          })
          return next.slice(0, MAX_IMAGES)
        })

        toast.success(`Đã tải lên ${urls.length} ảnh`)
      } catch (error) {
        onChange((prev) => prev.filter((_, index) => index < startIndex || index >= startIndex + toUpload.length))
        const message = error instanceof Error ? error.message : 'Tải ảnh thất bại'
        toast.error(message)
      } finally {
        setIsUploading(false)
        placeholders.forEach((item) => {
          if (item.value.startsWith('blob:')) URL.revokeObjectURL(item.value)
        })
      }
    },
    [items, onChange],
  )

  const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    void uploadFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (!canAddMore || isUploading) return
    const files = Array.from(event.dataTransfer.files ?? [])
    void uploadFiles(files)
  }

  const addLink = () => {
    const trimmed = linkDraft.trim()
    if (!trimmed) return
    if (!canAddMore) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh`)
      return
    }
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        toast.error('Link ảnh phải bắt đầu bằng http:// hoặc https://')
        return
      }
    } catch {
      toast.error('Link ảnh không hợp lệ')
      return
    }
    onChange([...items, { kind: 'url', value: trimmed }])
    setLinkDraft('')
  }

  const removeAt = (index: number) => {
    const removed = items[index]
    if (removed?.value.startsWith('blob:')) URL.revokeObjectURL(removed.value)
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <VStack align="stretch" spacing={4} className={className}>
      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'brand.500' : 'gray.300'}
        borderRadius="xl"
        bg={isDragging ? 'brand.50' : 'gray.50'}
        p={6}
        textAlign="center"
        cursor={canAddMore && !isUploading ? 'pointer' : 'not-allowed'}
        opacity={canAddMore ? 1 : 0.6}
        onDragOver={(event) => {
          event.preventDefault()
          if (canAddMore && !isUploading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (canAddMore && !isUploading) fileInputRef.current?.click()
        }}
      >
        <VStack spacing={2}>
          <Text fontWeight="700" color="gray.700">
            Kéo thả ảnh vào đây hoặc bấm để chọn từ máy
          </Text>
          <Text fontSize="sm" color="text.secondary">
            JPG, PNG, WEBP · Tối đa {MAX_FILE_SIZE_MB}MB/ảnh · {MAX_IMAGES} ảnh/sản phẩm
          </Text>
          {isUploading ? (
            <HStack justify="center" pt={2}>
              <Spinner size="sm" color="brand.500" />
              <Text fontSize="sm" color="brand.600">
                Đang tải ảnh lên máy chủ...
              </Text>
            </HStack>
          ) : (
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={(event) => {
                event.stopPropagation()
                fileInputRef.current?.click()
              }}
              disabled={!canAddMore}
            >
              Chọn ảnh từ máy
            </AppButton>
          )}
        </VStack>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFilePick}
        className="hidden"
      />

      <HStack align="flex-end" flexWrap="wrap" gap={2}>
        <Input
          value={linkDraft}
          onChange={(event) => setLinkDraft(event.target.value)}
          placeholder="Hoặc dán link ảnh (https://...)"
          flex="1"
          minW="220px"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addLink()
            }
          }}
        />
        <AppButton type="button" variant="outline" onClick={addLink} disabled={!canAddMore || isUploading}>
          Thêm link
        </AppButton>
      </HStack>

      {items.length > 0 ? (
        <HStack align="start" spacing={3} flexWrap="wrap">
          {items.map((item, index) => (
            <Box key={`${item.kind}-${item.value}-${index}`} position="relative" flexShrink={0}>
              <Box
                w="96px"
                h="96px"
                borderRadius="lg"
                borderWidth="2px"
                borderColor={index === 0 ? 'brand.600' : 'gray.200'}
                overflow="hidden"
                bg="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {item.kind === 'uploading' ? (
                  <Spinner color="brand.500" />
                ) : (
                  <img
                    src={resolveMediaUrl(item.value)}
                    alt={`Ảnh ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </Box>
              {index === 0 && item.kind !== 'uploading' ? (
                <Text
                  position="absolute"
                  bottom={1}
                  left={1}
                  fontSize="10px"
                  fontWeight="700"
                  bg="brand.600"
                  color="white"
                  px={1.5}
                  py={0.5}
                  borderRadius="sm"
                >
                  Bìa
                </Text>
              ) : null}
              {item.kind !== 'uploading' ? (
                <IconButton
                  aria-label="Xóa ảnh"
                  icon={<CloseIcon boxSize={2.5} />}
                  size="xs"
                  position="absolute"
                  top={-1}
                  right={-1}
                  borderRadius="full"
                  colorScheme="red"
                  onClick={() => removeAt(index)}
                />
              ) : null}
            </Box>
          ))}
        </HStack>
      ) : null}
    </VStack>
  )
}
