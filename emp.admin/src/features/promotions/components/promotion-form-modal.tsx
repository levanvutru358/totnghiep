import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputRightAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import { discountTypeLabel, formatPromotionValue } from '../lib/promotion-labels'
import type { PromotionDiscountType, PromotionFormInput } from '../types/promotion.type'

type PromotionFormModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  form: PromotionFormInput
  onChange: (next: PromotionFormInput) => void
  onSave: () => void
  isSaving: boolean
}

const SectionTitle = ({ children }: { children: string }) => (
  <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="text.secondary">
    {children}
  </Text>
)

const MoneyInput = ({
  value,
  onChange,
  placeholder,
  isDisabled,
}: {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  isDisabled?: boolean
}) => (
  <InputGroup>
    <Input
      type="number"
      min={0}
      value={value}
      placeholder={placeholder}
      isDisabled={isDisabled}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
    <InputRightAddon bg="gray.50">đ</InputRightAddon>
  </InputGroup>
)

const buildPreviewText = (form: PromotionFormInput) => {
  if (form.discountType === 'FREE_SHIPPING') {
    return `Miễn phí vận chuyển khi đơn từ ${form.minOrderAmount.toLocaleString('vi-VN')}đ`
  }
  const valueLabel = formatPromotionValue(
    form.discountType,
    form.discountValue,
    form.maxDiscountAmount ?? null,
  )
  return `Giảm ${valueLabel} khi đơn từ ${form.minOrderAmount.toLocaleString('vi-VN')}đ`
}

export const PromotionFormModal = ({
  isOpen,
  onClose,
  title,
  form,
  onChange,
  onSave,
  isSaving,
}: PromotionFormModalProps) => {
  const set = <K extends keyof PromotionFormInput>(key: K, value: PromotionFormInput[K]) => {
    onChange({ ...form, [key]: value })
  }

  const valueLabel =
    form.discountType === 'PERCENT'
      ? 'Phần trăm giảm'
      : form.discountType === 'FIXED'
        ? 'Số tiền giảm'
        : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="blackAlpha.400" />
      <ModalContent borderRadius="2xl" mx={4}>
        <ModalHeader borderBottomWidth="1px" borderColor="border.subtle" py={4}>
          <Text fontSize="lg" fontWeight="800">
            {title}
          </Text>
          <Text fontSize="sm" fontWeight="normal" color="text.secondary" mt={1}>
            Mã khách nhập khi thanh toán. Hệ thống tự tính giảm giá theo cấu hình bên dưới.
          </Text>
        </ModalHeader>
        <ModalCloseButton top={4} />

        <ModalBody py={5}>
          <VStack align="stretch" spacing={5}>
            <Alert status="info" borderRadius="lg" fontSize="sm">
              <AlertIcon />
              <AlertDescription>{buildPreviewText(form)}</AlertDescription>
            </Alert>

            <Box>
              <SectionTitle>Thông tin mã</SectionTitle>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mt={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Mã khuyến mãi</FormLabel>
                  <Input
                    fontFamily="mono"
                    fontWeight="700"
                    letterSpacing="0.04em"
                    value={form.code}
                    placeholder="VD: GIAM15K"
                    onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  />
                  <FormHelperText>Chỉ chữ và số, không dấu cách.</FormHelperText>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Tên hiển thị</FormLabel>
                  <Input
                    value={form.name}
                    placeholder="VD: Giảm 15.000đ"
                    onChange={(e) => set('name', e.target.value)}
                  />
                  <FormHelperText>Khách thấy khi áp mã thành công.</FormHelperText>
                </FormControl>
                <FormControl gridColumn={{ md: 'span 2' }}>
                  <FormLabel fontSize="sm">Mô tả (tuỳ chọn)</FormLabel>
                  <Textarea
                    rows={2}
                    resize="vertical"
                    value={form.description ?? ''}
                    placeholder="Điều kiện áp dụng, ghi chú nội bộ..."
                    onChange={(e) => set('description', e.target.value)}
                  />
                </FormControl>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Quy tắc giảm giá</SectionTitle>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mt={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Loại giảm</FormLabel>
                  <Select
                    value={form.discountType}
                    onChange={(e) =>
                      set('discountType', e.target.value as PromotionDiscountType)
                    }
                  >
                    {Object.entries(discountTypeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired={form.discountType !== 'FREE_SHIPPING'}>
                  <FormLabel fontSize="sm">{valueLabel ?? 'Giá trị'}</FormLabel>
                  {form.discountType === 'PERCENT' ? (
                    <InputGroup>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.discountValue}
                        onChange={(e) => set('discountValue', Number(e.target.value) || 0)}
                      />
                      <InputRightAddon bg="gray.50">%</InputRightAddon>
                    </InputGroup>
                  ) : (
                    <MoneyInput
                      value={form.discountValue}
                      isDisabled={form.discountType === 'FREE_SHIPPING'}
                      placeholder="0"
                      onChange={(v) => set('discountValue', v)}
                    />
                  )}
                  {form.discountType === 'FREE_SHIPPING' ? (
                    <FormHelperText>Không cần nhập — chỉ miễn phí ship.</FormHelperText>
                  ) : null}
                </FormControl>
                {form.discountType === 'PERCENT' ? (
                  <FormControl>
                    <FormLabel fontSize="sm">Giảm tối đa (tuỳ chọn)</FormLabel>
                    <MoneyInput
                      value={form.maxDiscountAmount ?? ''}
                      placeholder="Không giới hạn"
                      onChange={(v) => set('maxDiscountAmount', v > 0 ? v : null)}
                    />
                    <FormHelperText>Trần số tiền giảm khi dùng %.</FormHelperText>
                  </FormControl>
                ) : null}
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Giá trị đơn tối thiểu</FormLabel>
                  <MoneyInput
                    value={form.minOrderAmount}
                    onChange={(v) => set('minOrderAmount', v)}
                  />
                  <FormHelperText>Tổng sản phẩm trước khi trừ giảm giá.</FormHelperText>
                </FormControl>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Giới hạn sử dụng</SectionTitle>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mt={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Tổng lượt dùng</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={form.usageLimit ?? ''}
                    placeholder="Không giới hạn"
                    onChange={(e) =>
                      set('usageLimit', e.target.value ? Number(e.target.value) : null)
                    }
                  />
                  <FormHelperText>Để trống = không giới hạn toàn hệ thống.</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Lượt dùng / khách</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={form.usageLimitPerUser ?? ''}
                    onChange={(e) =>
                      set(
                        'usageLimitPerUser',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                  <FormHelperText>Mặc định 1 lần mỗi tài khoản.</FormHelperText>
                </FormControl>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Thời gian hiệu lực</SectionTitle>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mt={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Bắt đầu</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.startsAt ? dayjs(form.startsAt).format('YYYY-MM-DDTHH:mm') : ''}
                    onChange={(e) =>
                      set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)
                    }
                  />
                  <FormHelperText>Để trống = có hiệu lực ngay.</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Kết thúc</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.endsAt ? dayjs(form.endsAt).format('YYYY-MM-DDTHH:mm') : ''}
                    onChange={(e) =>
                      set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)
                    }
                  />
                  <FormHelperText>Để trống = không hết hạn.</FormHelperText>
                </FormControl>
              </Grid>
            </Box>

            <Box
              borderWidth="1px"
              borderColor={form.isActive ? 'green.200' : 'border.subtle'}
              bg={form.isActive ? 'green.50' : 'gray.50'}
              borderRadius="xl"
              px={4}
              py={3}
            >
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="700" fontSize="sm">
                    Kích hoạt mã
                  </Text>
                  <Text fontSize="xs" color="text.secondary" mt={0.5}>
                    Tắt để tạm ẩn mã, không xóa dữ liệu đã dùng.
                  </Text>
                </Box>
                <Switch
                  size="lg"
                  colorScheme="green"
                  isChecked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                />
              </HStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="border.subtle" gap={3} py={4}>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            colorScheme="pink"
            px={8}
            isLoading={isSaving}
            isDisabled={!form.code.trim() || !form.name.trim()}
            onClick={onSave}
          >
            Lưu mã
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
