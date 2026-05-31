import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Switch,
  Text,
} from '@chakra-ui/react'
import type { MarketingSectionProductFormInput } from '../types/marketing.type'
import { ProductPickerField } from './product-picker-field'

type MarketingFlashSaleFormInput = MarketingSectionProductFormInput

type FlashSaleFormModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  form: MarketingFlashSaleFormInput
  onChange: (next: MarketingFlashSaleFormInput) => void
  onSave: () => void
  isSaving: boolean
  showEndsAt?: boolean
  excludeProductIds?: number[]
  lockProduct?: boolean
  selectedProductName?: string
}

export const FlashSaleFormModal = ({
  isOpen,
  onClose,
  title,
  form,
  onChange,
  onSave,
  isSaving,
  showEndsAt = true,
  excludeProductIds = [],
  lockProduct = false,
  selectedProductName,
}: FlashSaleFormModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} size="lg">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>{title}</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          <Box gridColumn={{ md: '1 / -1' }}>
            <ProductPickerField
              value={form.productId}
              onChange={(productId) => onChange({ ...form, productId })}
              excludeProductIds={excludeProductIds}
              lockSelection={lockProduct}
              selectedLabel={selectedProductName}
            />
          </Box>
          <FormControl isRequired>
            <FormLabel>Giảm giá (%)</FormLabel>
            <NumberInput
              min={0}
              max={100}
              value={form.discountPercent === '' ? '' : form.discountPercent}
              onChange={(_, valueAsNumber) =>
                onChange({
                  ...form,
                  discountPercent: Number.isNaN(valueAsNumber)
                    ? ''
                    : Math.min(100, valueAsNumber),
                })
              }
            >
              <NumberInputField placeholder="VD: 13" />
            </NumberInput>
            <Text fontSize="xs" color="text.secondary" mt={1}>
              Áp dụng trên giá bán hiện tại của sản phẩm. Trang chủ sẽ hiện giá sau giảm, giá gạch ngang và badge %
            </Text>
          </FormControl>
          <FormControl>
            <FormLabel>Nhãn thẻ (tùy chọn)</FormLabel>
            <Input
              value={form.badgeLabel}
              onChange={(e) => onChange({ ...form, badgeLabel: e.target.value })}
              placeholder="Để trống = tự động -13%"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Thứ tự</FormLabel>
            <NumberInput
              min={0}
              value={form.sortOrder}
              onChange={(_, value) => onChange({ ...form, sortOrder: Number(value) || 0 })}
            >
              <NumberInputField />
            </NumberInput>
          </FormControl>
          {showEndsAt ? (
            <FormControl>
              <FormLabel>Kết thúc (tùy chọn)</FormLabel>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => onChange({ ...form, endsAt: e.target.value })}
              />
            </FormControl>
          ) : null}
          <FormControl display="flex" alignItems="center" gap={3}>
            <Switch
              isChecked={form.isActive}
              onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
            />
            <FormLabel mb={0}>Đang hiển thị</FormLabel>
          </FormControl>
        </Grid>
      </ModalBody>
      <ModalFooter gap={2}>
        <Button variant="ghost" onClick={onClose}>
          Hủy
        </Button>
        <Button colorScheme="pink" onClick={onSave} isLoading={isSaving}>
          Lưu
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
)
