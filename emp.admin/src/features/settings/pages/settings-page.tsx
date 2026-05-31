import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  NumberInput,
  NumberInputField,
  Skeleton,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { resolveMediaUrl } from '../../products/lib/media-url'
import { uploadApi } from '../../products/services/upload.api'
import { useShopSettings, useUpdateShopSettings } from '../hooks/use-settings'
import type { ShopSettings } from '../types/shop-settings.type'

const emptyForm = (): ShopSettings => ({
  shopName: 'DTT Shop',
  logoUrl: '/logo-dtt.png',
  supportPhone: '',
  supportEmail: '',
  defaultShippingFee: 12,
  freeShippingMinSubtotal: 200,
  paymentPayosEnabled: true,
  paymentZalopayEnabled: true,
  defaultPaymentProvider: 'PAYOS',
  returnPolicyText: '',
  shippingPolicyText: '',
  chatbotEnabled: true,
  registrationEnabled: true,
  updatedAt: null,
})

export const SettingsPage = () => {
  const { data, isLoading, isError, refetch } = useShopSettings()
  const update = useUpdateShopSettings()
  const [form, setForm] = useState<ShopSettings>(emptyForm())
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const patch = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files?.length) return
    try {
      const urls = await uploadApi.uploadImages([files[0]])
      if (urls[0]) {
        patch('logoUrl', urls[0])
        toast.success('Đã tải logo lên')
      }
    } catch {
      toast.error('Không tải được logo')
    }
  }

  const handleSave = async () => {
    if (!form.shopName.trim()) {
      toast.error('Vui lòng nhập tên shop')
      return
    }
    if (!form.logoUrl.trim()) {
      toast.error('Vui lòng nhập URL logo')
      return
    }
    if (!form.paymentPayosEnabled && !form.paymentZalopayEnabled) {
      toast.error('Phải bật ít nhất một cổng thanh toán')
      return
    }

    try {
      await update.mutateAsync({
        ...form,
        shopName: form.shopName.trim(),
        logoUrl: form.logoUrl.trim(),
        supportPhone: form.supportPhone?.trim() || null,
        supportEmail: form.supportEmail?.trim() || null,
        returnPolicyText: form.returnPolicyText?.trim() || null,
        shippingPolicyText: form.shippingPolicyText?.trim() || null,
      })
      toast.success('Đã lưu cài đặt — shop client sẽ đồng bộ sau vài giây')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu cài đặt thất bại')
    }
  }

  if (isLoading) {
    return (
      <VStack align="stretch" spacing={4}>
        <Skeleton h="40px" />
        <Skeleton h="320px" />
      </VStack>
    )
  }

  if (isError) {
    return (
      <VStack align="stretch" spacing={4}>
        <Text color="red.500">Không tải được cài đặt.</Text>
        <Button onClick={() => void refetch()}>Thử lại</Button>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" spacing={6}>
      <HStack justify="space-between" flexWrap="wrap">
        <Box>
          <Heading size="lg">Cài đặt cửa hàng</Heading>
          <Text color="gray.600" fontSize="sm" mt={1}>
            Thông tin hiển thị trên shop, phí ship, cổng thanh toán và tính năng.
          </Text>
        </Box>
        <Button colorScheme="blue" isLoading={update.isPending} onClick={() => void handleSave()}>
          Lưu thay đổi
        </Button>
      </HStack>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList flexWrap="wrap">
          <Tab>Thông tin shop</Tab>
          <Tab>Vận chuyển</Tab>
          <Tab>Thanh toán</Tab>
          <Tab>Chính sách</Tab>
          <Tab>Tính năng</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <VStack align="stretch" spacing={4} maxW="640px">
              <FormControl isRequired>
                <FormLabel>Tên shop</FormLabel>
                <Input
                  value={form.shopName}
                  onChange={(e) => patch('shopName', e.target.value)}
                  placeholder="DTT Shop"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Logo</FormLabel>
                <HStack align="start" spacing={4}>
                  <Image
                    src={resolveMediaUrl(form.logoUrl)}
                    alt={form.shopName}
                    boxSize="80px"
                    objectFit="contain"
                    borderWidth="1px"
                    borderRadius="md"
                    fallbackSrc="/logo-dtt.png"
                  />
                  <VStack align="stretch" flex={1} spacing={2}>
                    <Input
                      value={form.logoUrl}
                      onChange={(e) => patch('logoUrl', e.target.value)}
                      placeholder="/logo-dtt.png hoặc /uploads/..."
                    />
                    <HStack>
                      <Button size="sm" onClick={() => logoInputRef.current?.click()}>
                        Tải ảnh lên
                      </Button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => void handleLogoUpload(e.target.files)}
                      />
                    </HStack>
                  </VStack>
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Hotline hỗ trợ</FormLabel>
                <Input
                  value={form.supportPhone ?? ''}
                  onChange={(e) => patch('supportPhone', e.target.value)}
                  placeholder="1900-xxxx"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email hỗ trợ</FormLabel>
                <Input
                  type="email"
                  value={form.supportEmail ?? ''}
                  onChange={(e) => patch('supportEmail', e.target.value)}
                  placeholder="hotro@shop.vn"
                />
              </FormControl>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <VStack align="stretch" spacing={4} maxW="480px">
              <FormControl>
                <FormLabel>Phí ship mặc định (đơn vị giá catalog)</FormLabel>
                <NumberInput
                  min={0}
                  value={form.defaultShippingFee}
                  onChange={(_, v) => patch('defaultShippingFee', Number.isFinite(v) ? v : 0)}
                >
                  <NumberInputField />
                </NumberInput>
                <FormHelperText>
                  Ví dụ: 12 tương đương 12.000đ phí ship khi chưa đủ điều kiện freeship.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Ngưỡng freeship — tổng tiền hàng tối thiểu (catalog)</FormLabel>
                <NumberInput
                  min={0}
                  value={form.freeShippingMinSubtotal}
                  onChange={(_, v) =>
                    patch('freeShippingMinSubtotal', Number.isFinite(v) ? v : 0)
                  }
                >
                  <NumberInputField />
                </NumberInput>
                <FormHelperText>
                  Ví dụ: 200 = đơn từ 200.000đ được miễn phí ship. Đặt 0 để tắt freeship theo
                  ngưỡng.
                </FormHelperText>
              </FormControl>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <VStack align="stretch" spacing={4} maxW="480px">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Bật PayOS
                </FormLabel>
                <Switch
                  isChecked={form.paymentPayosEnabled}
                  onChange={(e) => patch('paymentPayosEnabled', e.target.checked)}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Bật ZaloPay
                </FormLabel>
                <Switch
                  isChecked={form.paymentZalopayEnabled}
                  onChange={(e) => patch('paymentZalopayEnabled', e.target.checked)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Cổng mặc định (ưu tiên hiển thị)</FormLabel>
                <HStack>
                  <Button
                    size="sm"
                    variant={form.defaultPaymentProvider === 'PAYOS' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    onClick={() => patch('defaultPaymentProvider', 'PAYOS')}
                  >
                    PayOS
                  </Button>
                  <Button
                    size="sm"
                    variant={form.defaultPaymentProvider === 'ZALOPAY' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    onClick={() => patch('defaultPaymentProvider', 'ZALOPAY')}
                  >
                    ZaloPay
                  </Button>
                </HStack>
                <FormHelperText>
                  Cổng chỉ hiện trên shop khi được bật ở đây và đã cấu hình biến môi trường trên
                  server.
                </FormHelperText>
              </FormControl>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Chính sách đổi trả (hiển thị client)</FormLabel>
                <Textarea
                  rows={8}
                  value={form.returnPolicyText ?? ''}
                  onChange={(e) => patch('returnPolicyText', e.target.value)}
                  placeholder="Mô tả quy trình đổi trả, thời hạn, điều kiện..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Chính sách vận chuyển (hiển thị client)</FormLabel>
                <Textarea
                  rows={8}
                  value={form.shippingPolicyText ?? ''}
                  onChange={(e) => patch('shippingPolicyText', e.target.value)}
                  placeholder="Thời gian giao hàng, khu vực, phí ship..."
                />
              </FormControl>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <VStack align="stretch" spacing={4} maxW="480px">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Chatbot hỗ trợ
                </FormLabel>
                <Switch
                  isChecked={form.chatbotEnabled}
                  onChange={(e) => patch('chatbotEnabled', e.target.checked)}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Cho phép đăng ký tài khoản
                </FormLabel>
                <Switch
                  isChecked={form.registrationEnabled}
                  onChange={(e) => patch('registrationEnabled', e.target.checked)}
                />
              </FormControl>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {data?.updatedAt ? (
        <Text fontSize="xs" color="gray.500">
          Cập nhật lần cuối: {new Date(data.updatedAt).toLocaleString('vi-VN')}
        </Text>
      ) : null}
    </VStack>
  )
}
