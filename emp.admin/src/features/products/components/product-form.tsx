import React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { productSchemaWithSaleCheck, type ProductFormData } from '../schemas/product.schema'
import { useProductMutation } from '../hooks/use-product-mutation'
import { useProductDetail } from '../hooks/use-product-detail'
import { ROUTES } from '../../../app/router/route-names'
import { ProductVariantsEditor } from './product-variants-editor'
import {
  colorGroupsToColorImages,
  colorGroupsToValidVariants,
  colorGroupsToVariants,
  createEmptyColorGroup,
  mergeColorImagesIntoGroups,
  variantsToColorGroups,
} from '../lib/product-variants.lib'
import type { ProductColorImages } from '../types/product.type'
import { useBrands, useCategories } from '../../categories/hooks/use-category-brand'
import {
  getCategoryDisplayLabel,
  getFirstLeafCategoryId,
  groupCategoriesForSelect,
} from '../../categories/utils/category-brand.util'

interface ProductFormProps {
  productId?: string
}

export const ProductForm: React.FC<ProductFormProps> = ({ productId }) => {
  const navigate = useNavigate()
  const isEditing = !!productId
  const [colorImages, setColorImages] = React.useState<ProductColorImages[]>([])

  const { data: product } = useProductDetail(productId || '')
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const { data: brands = [], isLoading: brandsLoading } = useBrands()
  const mutation = useProductMutation()

  const categoryGroups = React.useMemo(() => groupCategoriesForSelect(categories), [categories])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    control,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchemaWithSaleCheck),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          salePrice: product.salePrice ?? null,
          brandId: product.brandId ?? '',
          categoryId: product.categoryId ?? '',
          stock: product.stock,
          status: product.status === 'inactive' ? 'inactive' : 'active',
          imageUrls: product.images ?? (product.image ? [product.image] : []),
          variants: product.variants,
        }
      : {
          name: '',
          description: '',
          brandId: '',
          categoryId: '',
          stock: 0,
          status: 'active',
          imageUrls: [],
          variants: colorGroupsToVariants([createEmptyColorGroup()]),
        },
  })

  const watchedVariants = useWatch({ control, name: 'variants' }) ?? []
  const watchedName = useWatch({ control, name: 'name' }) ?? ''

  const displayColorImages = React.useMemo(() => {
    if (colorImages.length > 0) return colorImages
    return product?.colorImages ?? []
  }, [colorImages, product?.colorImages])

  const variantsEditorResetKey = React.useMemo(() => {
    if (!isEditing) return 'new'
    if (!product) return `loading-${productId ?? 'new'}`
    const imageSignature = (product.colorImages ?? [])
      .map((entry) => `${entry.color}:${entry.imageUrls.length}`)
      .join('|')
    return `${productId}-${product.updatedAt}-${imageSignature}`
  }, [isEditing, product, productId])

  React.useEffect(() => {
    if (!product) return
    setValue('name', product.name)
    setValue('description', product.description || '')
    setValue('basePrice', product.basePrice)
    setValue('salePrice', product.salePrice ?? null)
    setValue('stock', product.stock)
    setValue('status', product.status === 'inactive' ? 'inactive' : 'active')
    setValue('variants', product.variants)

    setValue('imageUrls', product.images ?? (product.image ? [product.image] : []))
    setColorImages(product.colorImages ?? [])

    let categoryId =
      product.categoryId ??
      categories.find((item) => item.name === product.category)?.id ??
      ''
    const brandId =
      product.brandId ?? brands.find((item) => item.name === product.brand)?.id ?? ''

    const selected = categories.find((item) => item.id === categoryId)
    if (selected && !selected.parentId) {
      const firstChild = categoryGroups.find((group) => group.parent.id === selected.id)?.children[0]
      if (firstChild) categoryId = firstChild.id
    }

    setValue('categoryId', categoryId)
    setValue('brandId', brandId)
  }, [product, categories, brands, categoryGroups, setValue])

  React.useEffect(() => {
    if (isEditing || categoriesLoading || categories.length === 0) return
    const current = getValues('categoryId')
    if (!current) {
      setValue('categoryId', getFirstLeafCategoryId(categories))
    }
  }, [isEditing, categoriesLoading, categories, setValue, getValues])

  const extractErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { message?: string } | undefined
      if (data?.message) return data.message
    }
    if (error instanceof Error && error.message) return error.message
    return 'Lưu sản phẩm thất bại'
  }

  const onSubmit = async (data: ProductFormData) => {
    const groups = mergeColorImagesIntoGroups(variantsToColorGroups(data.variants), colorImages)
    const validVariants = colorGroupsToValidVariants(groups)
    const payloadColorImages = colorGroupsToColorImages(groups)

    if (validVariants.length === 0) {
      toast.error('Thêm ít nhất một màu, kích cỡ và SKU hợp lệ')
      return
    }

    const colorsWithVariants = [...new Set(validVariants.map((item) => item.color.trim()))]
    for (const color of colorsWithVariants) {
      const images = payloadColorImages.find((item) => item.color === color)?.imageUrls ?? []
      if (images.length === 0) {
        toast.error(`Màu "${color}" cần ít nhất một ảnh`)
        return
      }
    }

    if (payloadColorImages.length === 0) {
      toast.error('Vui lòng thêm ảnh cho từng màu sản phẩm')
      return
    }

    try {
      const totalStock = validVariants.reduce((sum, item) => sum + item.stock, 0)
      const imageUrls = payloadColorImages.flatMap((item) => item.imageUrls)
      const payload = {
        ...data,
        variants: validVariants,
        colorImages: payloadColorImages,
        imageUrls,
        imageFiles: [] as File[],
        stock: totalStock,
      }

      if (isEditing && productId) {
        await mutation.mutateAsync({ id: productId, ...payload })
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        await mutation.mutateAsync(payload)
        toast.success('Tạo sản phẩm thành công!')
      }
      navigate(ROUTES.PRODUCTS)
    } catch (error) {
      toast.error(extractErrorMessage(error))
    }
  }

  const statusOptions = [
    { value: 'active', label: 'Đang bán' },
    { value: 'inactive', label: 'Ngưng bán' },
  ]

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <VStack align="stretch" gap={6}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <FormControl isInvalid={!!errors.name}>
            <FormLabel>Tên sản phẩm</FormLabel>
            <Input {...register('name')} placeholder="Nhập tên sản phẩm" />
            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.basePrice}>
            <FormLabel>Giá gốc</FormLabel>
            <Input
              type="number"
              step="1"
              min="0"
              {...register('basePrice', { valueAsNumber: true })}
              placeholder="VD: 129 (129.000đ) hoặc 1290000"
            />
            <FormErrorMessage>{errors.basePrice?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.salePrice}>
            <FormLabel>Giá khuyến mãi (tùy chọn)</FormLabel>
            <Input
              type="number"
              step="1"
              min="0"
              {...register('salePrice', {
                setValueAs: (value) => (value === '' || value === null ? null : Number(value)),
              })}
              placeholder="Để trống nếu không giảm"
            />
            <Text fontSize="xs" color="text.secondary" mt={1}>
              Nhỏ hơn giá gốc để hiển thị giảm giá trên shop.
            </Text>
            <FormErrorMessage>{errors.salePrice?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.brandId}>
            <FormLabel>Thương hiệu</FormLabel>
            <Select
              {...register('brandId')}
              placeholder="Chọn thương hiệu"
              isDisabled={brandsLoading}
            >
              {brands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            {!brandsLoading && brands.length === 0 && (
              <Text fontSize="sm" color="text.secondary" mt={1}>
                Chưa có thương hiệu.{' '}
                <Link to={ROUTES.CATEGORIES} style={{ color: 'var(--chakra-colors-brand-600)' }}>
                  Thêm tại Quản lý danh mục
                </Link>
              </Text>
            )}
            <FormErrorMessage>{errors.brandId?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.categoryId}>
            <FormLabel>Danh mục (chọn loại con)</FormLabel>
            <Select
              {...register('categoryId')}
              placeholder="Chọn danh mục"
              isDisabled={categoriesLoading}
            >
              {categoryGroups.map((group) => (
                <optgroup key={group.parent.id} label={getCategoryDisplayLabel(group.parent)}>
                  {group.children.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {!categoriesLoading && categories.length === 0 && (
              <Text fontSize="sm" color="text.secondary" mt={1}>
                Chưa có danh mục.{' '}
                <Link to={ROUTES.CATEGORIES} style={{ color: 'var(--chakra-colors-brand-600)' }}>
                  Thêm tại Quản lý danh mục
                </Link>
              </Text>
            )}
            <FormErrorMessage>{errors.categoryId?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.status}>
            <FormLabel>Trạng thái</FormLabel>
            <Select {...register('status')} placeholder="Chọn trạng thái">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
            <FormErrorMessage>{errors.status?.message}</FormErrorMessage>
          </FormControl>
        </Grid>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          {(!isEditing || product) && (
          <ProductVariantsEditor
            value={watchedVariants}
            onChange={(next) => setValue('variants', next, { shouldDirty: true })}
            onColorImagesChange={setColorImages}
            colorImages={displayColorImages}
            productName={watchedName}
            resetKey={variantsEditorResetKey}
            errorMessage={
              errors.variants?.message ??
              (errors.variants && !Array.isArray(errors.variants)
                ? 'Kiểm tra lại màu, kích cỡ, SKU và tồn kho từng biến thể.'
                : undefined)
            }
          />
          )}
        </Box>

        <FormControl isInvalid={!!errors.description}>
          <FormLabel>Mô tả</FormLabel>
          <Textarea {...register('description')} rows={4} placeholder="Nhập mô tả sản phẩm" />
          <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
        </FormControl>

        <HStack justify="flex-end">
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.PRODUCTS)}>Hủy</Button>
          <Button type="submit" isLoading={mutation.isPending}>{isEditing ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}</Button>
        </HStack>
      </VStack>
    </Box>
  )
}
