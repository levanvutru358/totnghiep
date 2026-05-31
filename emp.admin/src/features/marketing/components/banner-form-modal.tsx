import {
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
  Textarea,
} from '@chakra-ui/react'
import type { MarketingBannerFormInput } from '../types/marketing.type'

type BannerFormModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  form: MarketingBannerFormInput
  onChange: (next: MarketingBannerFormInput) => void
  onSave: () => void
  isSaving: boolean
}

export const BannerFormModal = ({
  isOpen,
  onClose,
  title,
  form,
  onChange,
  onSave,
  isSaving,
}: BannerFormModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} size="xl">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>{title}</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          <FormControl gridColumn={{ md: '1 / -1' }} isRequired>
            <FormLabel>Tiêu đề</FormLabel>
            <Input value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} />
          </FormControl>
          <FormControl gridColumn={{ md: '1 / -1' }}>
            <FormLabel>Mô tả</FormLabel>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
            />
          </FormControl>
          <FormControl gridColumn={{ md: '1 / -1' }} isRequired>
            <FormLabel>URL ảnh banner</FormLabel>
            <Input
              value={form.imageUrl}
              onChange={(e) => onChange({ ...form, imageUrl: e.target.value })}
              placeholder="https://... hoặc /uploads/..."
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Liên kết (đường dẫn)</FormLabel>
            <Input
              value={form.linkUrl}
              onChange={(e) => onChange({ ...form, linkUrl: e.target.value })}
              placeholder="/categories"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Nút CTA</FormLabel>
            <Input
              value={form.ctaLabel}
              onChange={(e) => onChange({ ...form, ctaLabel: e.target.value })}
              placeholder="Xem ngay"
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
          <FormControl display="flex" alignItems="center" gap={3}>
            <Switch
              isChecked={form.isActive}
              onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
            />
            <FormLabel mb={0}>Đang hiển thị</FormLabel>
          </FormControl>
          <FormControl>
            <FormLabel>Bắt đầu (tùy chọn)</FormLabel>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => onChange({ ...form, startsAt: e.target.value })}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Kết thúc (tùy chọn)</FormLabel>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => onChange({ ...form, endsAt: e.target.value })}
            />
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
