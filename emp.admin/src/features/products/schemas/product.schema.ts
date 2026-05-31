import { z } from 'zod'

const variantDraftSchema = z.object({
  id: z.string().optional(),
  size: z.string(),
  color: z.string(),
  sku: z.string(),
  stock: z.number().min(0, 'Tồn kho biến thể phải lớn hơn hoặc bằng 0').int('Tồn kho phải là số nguyên'),
})

const isCompleteVariant = (variant: z.infer<typeof variantDraftSchema>) =>
  Boolean(variant.color.trim() && variant.size.trim() && variant.sku.trim())


export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên sản phẩm là bắt buộc')
    .max(100, 'Tên sản phẩm không được vượt quá 100 ký tự'),
  description: z
    .string()
    .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
    .optional(),
  basePrice: z
    .number({ message: 'Giá gốc là bắt buộc' })
    .min(1, 'Giá gốc phải lớn hơn 0')
    .max(999999999, 'Giá quá lớn'),
  salePrice: z
    .number()
    .min(1, 'Giá khuyến mãi phải lớn hơn 0')
    .max(999999999, 'Giá quá lớn')
    .optional()
    .nullable(),
  brandId: z.string().min(1, 'Thương hiệu là bắt buộc'),
  categoryId: z.string().min(1, 'Danh mục là bắt buộc'),
  stock: z
    .number()
    .min(0, 'Tồn kho phải lớn hơn hoặc bằng 0')
    .int('Tồn kho phải là số nguyên'),
  status: z.enum(['active', 'inactive']),
  imageUrls: z.array(z.string().trim()).optional(),
  variants: z
    .array(variantDraftSchema)
    .refine((items) => items.some(isCompleteVariant), {
      message: 'Cần ít nhất một biến thể (màu, kích cỡ, SKU)',
    }),
})

export type ProductFormData = z.infer<typeof productSchema>

export const productSchemaWithSaleCheck = productSchema.refine(
  (data) => {
    if (data.salePrice == null || data.salePrice === undefined) return true
    return data.salePrice < data.basePrice
  },
  { message: 'Giá khuyến mãi phải nhỏ hơn giá gốc', path: ['salePrice'] },
)