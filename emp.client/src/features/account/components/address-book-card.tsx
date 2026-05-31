import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { addressesApi } from '../services/addresses.api'
import {
  addressToForm,
  emptyAddressForm,
  formatAddressLine,
  type AddressFormInput,
  type UserAddress,
} from '../types/address.type'

type AddressBookCardProps = {
  embedded?: boolean
}

export const AddressBookCard = ({ embedded }: AddressBookCardProps) => {
  const toast = useToast()
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(true)
  const modal = useDisclosure()
  const [editing, setEditing] = useState<UserAddress | null>(null)
  const [form, setForm] = useState<AddressFormInput>(emptyAddressForm())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const list = await addressesApi.list()
      setAddresses(list)
    } catch {
      toast({ title: 'Không tải được sổ địa chỉ', status: 'error', duration: 3000, position: 'top' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyAddressForm(), isDefault: addresses.length === 0 })
    modal.onOpen()
  }

  const openEdit = (row: UserAddress) => {
    setEditing(row)
    setForm(addressToForm(row))
    modal.onOpen()
  }

  const save = async () => {
    try {
      setSaving(true)
      if (editing) {
        await addressesApi.update(editing.id, form)
        toast({ title: 'Đã cập nhật địa chỉ', status: 'success', duration: 2500, position: 'top' })
      } else {
        await addressesApi.create(form)
        toast({ title: 'Đã thêm địa chỉ', status: 'success', duration: 2500, position: 'top' })
      }
      modal.onClose()
      await load()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Lưu thất bại',
        status: 'error',
        duration: 3000,
        position: 'top',
      })
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: UserAddress) => {
    if (!window.confirm('Xóa địa chỉ này?')) return
    try {
      await addressesApi.remove(row.id)
      toast({ title: 'Đã xóa địa chỉ', status: 'success', duration: 2500, position: 'top' })
      await load()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Xóa thất bại',
        status: 'error',
        duration: 3000,
        position: 'top',
      })
    }
  }

  const setDefault = async (row: UserAddress) => {
    try {
      await addressesApi.update(row.id, { ...addressToForm(row), isDefault: true })
      toast({ title: 'Đã đặt làm địa chỉ mặc định', status: 'success', duration: 2500, position: 'top' })
      await load()
    } catch {
      toast({ title: 'Không thể đặt mặc định', status: 'error', duration: 3000, position: 'top' })
    }
  }

  const content = (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Text fontWeight="800">Sổ địa chỉ</Text>
          <Text fontSize="sm" color="text.secondary">
            Dùng lại khi thanh toán. Địa chỉ nhập lần đầu sẽ được lưu tự động.
          </Text>
        </Box>
        <Button size="sm" colorScheme="pink" onClick={openCreate}>
          Thêm địa chỉ
        </Button>
      </HStack>

      {loading ? <Text fontSize="sm" color="text.secondary">Đang tải...</Text> : null}

      {!loading && addresses.length === 0 ? (
        <Box borderWidth="1px" borderStyle="dashed" borderRadius="lg" p={6} textAlign="center">
          <Text color="text.secondary" fontSize="sm">
            Chưa có địa chỉ. Thanh toán lần đầu sẽ tự lưu, hoặc thêm thủ công tại đây.
          </Text>
          <Button size="sm" colorScheme="pink" mt={3} onClick={openCreate}>
            Thêm địa chỉ
          </Button>
        </Box>
      ) : null}

      {!loading
        ? addresses.map((row) => (
            <Box
              key={row.id}
              borderWidth="1px"
              borderColor={row.isDefault ? 'brand.300' : 'border.subtle'}
              bg={row.isDefault ? 'brand.50' : 'white'}
              borderRadius="lg"
              p={4}
            >
              <HStack justify="space-between" align="start" gap={3}>
                <Box flex={1} minW={0}>
                  <HStack gap={2} mb={1} flexWrap="wrap">
                    <Text fontWeight="800">{row.recipientName}</Text>
                    <Text fontSize="sm" color="text.secondary">
                      {row.recipientPhone}
                    </Text>
                    {row.isDefault ? (
                      <Badge colorScheme="pink" borderRadius="md">
                        Mặc định
                      </Badge>
                    ) : null}
                    {row.label ? (
                      <Badge variant="outline" borderRadius="md">
                        {row.label}
                      </Badge>
                    ) : null}
                  </HStack>
                  <Text fontSize="sm" color="text.secondary">
                    {formatAddressLine(row)}
                  </Text>
                </Box>
                <VStack align="stretch" spacing={1}>
                  {!row.isDefault ? (
                    <Button size="xs" variant="ghost" onClick={() => void setDefault(row)}>
                      Đặt mặc định
                    </Button>
                  ) : null}
                  <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
                    Sửa
                  </Button>
                  <Button size="xs" colorScheme="red" variant="ghost" onClick={() => void onDelete(row)}>
                    Xóa
                  </Button>
                </VStack>
              </HStack>
            </Box>
          ))
        : null}
    </VStack>
  )

  return (
    <>
      {embedded ? content : <Box {...{ bg: 'surface.card', borderWidth: '1px', borderRadius: 'xl', p: 5 }}>{content}</Box>}

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <FormControl>
                <FormLabel fontSize="sm">Nhãn (tuỳ chọn)</FormLabel>
                <Input
                  value={form.label}
                  placeholder="Nhà, Công ty..."
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Người nhận</FormLabel>
                <Input
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Số điện thoại</FormLabel>
                <Input
                  value={form.recipientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }} isRequired>
                <FormLabel fontSize="sm">Địa chỉ</FormLabel>
                <Input
                  value={form.addressLine1}
                  placeholder="Số nhà, tên đường"
                  onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
                <FormLabel fontSize="sm">Địa chỉ bổ sung</FormLabel>
                <Textarea
                  rows={2}
                  value={form.addressLine2}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Phường / Xã</FormLabel>
                <Input value={form.ward} onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Quận / Huyện</FormLabel>
                <Input
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Tỉnh / Thành phố</FormLabel>
                <Input
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Mã bưu chính</FormLabel>
                <Input
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
                <Checkbox
                  isChecked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                >
                  Đặt làm địa chỉ mặc định
                </Checkbox>
              </FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={modal.onClose}>
              Hủy
            </Button>
            <Button colorScheme="pink" isLoading={saving} onClick={() => void save()}>
              Lưu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

/** Prefill checkout from a saved address */
export const applyAddressToCheckout = (
  address: UserAddress,
  setters: {
    setRecipientName: (v: string) => void
    setRecipientPhone: (v: string) => void
    setShippingAddressLine1: (v: string) => void
    setShippingAddressLine2: (v: string) => void
    setShippingWard: (v: string) => void
    setShippingDistrict: (v: string) => void
    setShippingProvince: (v: string) => void
    setShippingPostalCode: (v: string) => void
  },
) => {
  setters.setRecipientName(address.recipientName)
  setters.setRecipientPhone(address.recipientPhone)
  setters.setShippingAddressLine1(address.addressLine1)
  setters.setShippingAddressLine2(address.addressLine2 ?? '')
  setters.setShippingWard(address.ward ?? '')
  setters.setShippingDistrict(address.district)
  setters.setShippingProvince(address.province)
  setters.setShippingPostalCode(address.postalCode ?? '')
}
