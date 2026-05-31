import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { resolveMediaUrl } from '../../products/lib/media-url'
import { BannerFormModal } from '../components/banner-form-modal'
import { SectionProductsPanel } from '../components/section-products-panel'
import { useMarketingBannerMutations, useMarketingBanners } from '../hooks/use-marketing'
import type { MarketingBanner, MarketingBannerFormInput } from '../types/marketing.type'

const toLocalInput = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyBannerForm = (): MarketingBannerFormInput => ({
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '/categories',
  ctaLabel: '',
  sortOrder: 0,
  isActive: true,
  startsAt: '',
  endsAt: '',
})

const bannerToForm = (row: MarketingBanner): MarketingBannerFormInput => ({
  title: row.title,
  description: row.description ?? '',
  imageUrl: row.imageUrl,
  linkUrl: row.linkUrl,
  ctaLabel: row.ctaLabel ?? '',
  sortOrder: row.sortOrder,
  isActive: row.isActive,
  startsAt: toLocalInput(row.startsAt),
  endsAt: toLocalInput(row.endsAt),
})

export const MarketingPage = () => {
  const bannerModal = useDisclosure()
  const [editingBanner, setEditingBanner] = useState<MarketingBanner | null>(null)
  const [bannerForm, setBannerForm] = useState<MarketingBannerFormInput>(emptyBannerForm())

  const { data: banners = [], isLoading: bannersLoading } = useMarketingBanners()
  const bannerMutations = useMarketingBannerMutations()

  const openCreateBanner = () => {
    setEditingBanner(null)
    setBannerForm(emptyBannerForm())
    bannerModal.onOpen()
  }

  const openEditBanner = (row: MarketingBanner) => {
    setEditingBanner(row)
    setBannerForm(bannerToForm(row))
    bannerModal.onOpen()
  }

  const saveBanner = async () => {
    try {
      if (editingBanner) {
        await bannerMutations.update.mutateAsync({ id: editingBanner.id, body: bannerForm })
        toast.success('Đã cập nhật banner')
      } else {
        await bannerMutations.create.mutateAsync(bannerForm)
        toast.success('Đã thêm banner')
      }
      bannerModal.onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Tiếp thị</Heading>
        <Text color="text.secondary" mt={1}>
          Cấu hình nội dung trang chủ: carousel, Top Deal, Flash Sale, Top bán chạy và Gợi ý hôm nay.
        </Text>
      </Box>

      <Tabs colorScheme="pink" variant="enclosed">
        <TabList flexWrap="wrap">
          <Tab>Carousel</Tab>
          <Tab>Top Deal</Tab>
          <Tab>Flash Sale</Tab>
          <Tab>Top bán chạy</Tab>
          <Tab>Gợi ý hôm nay</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <VStack align="stretch" gap={4}>
              <HStack justify="flex-end">
                <Button colorScheme="pink" onClick={openCreateBanner}>
                  Thêm slide
                </Button>
              </HStack>
              <Box bg="surface.card" borderWidth="1px" borderRadius="xl" overflow="hidden">
                {bannersLoading ? (
                  <Skeleton height="200px" m={4} />
                ) : (
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Ảnh</Th>
                        <Th>Tiêu đề</Th>
                        <Th>Thứ tự</Th>
                        <Th>TT</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {banners.map((row) => (
                        <Tr key={row.id}>
                          <Td>
                            <Image
                              src={resolveMediaUrl(row.imageUrl)}
                              alt={row.title}
                              boxSize="56px"
                              objectFit="cover"
                              borderRadius="md"
                            />
                          </Td>
                          <Td maxW="300px">
                            <Text fontWeight="700" noOfLines={2}>
                              {row.title}
                            </Text>
                            <Text fontSize="xs" color="text.secondary">
                              {row.linkUrl}
                            </Text>
                          </Td>
                          <Td>{row.sortOrder}</Td>
                          <Td>
                            <Badge colorScheme={row.isActive ? 'green' : 'gray'}>
                              {row.isActive ? 'Hiển thị' : 'Ẩn'}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Button size="xs" variant="outline" onClick={() => openEditBanner(row)}>
                                Sửa
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="red"
                                onClick={async () => {
                                  if (!window.confirm('Xóa slide này?')) return
                                  try {
                                    await bannerMutations.remove.mutateAsync(row.id)
                                    toast.success('Đã xóa')
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
                                  }
                                }}
                              >
                                Xóa
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Box>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <SectionProductsPanel
              section="TOP_DEAL"
              description="Khối ngay dưới danh mục nổi bật trên trang chủ (tối đa 6 sản phẩm)."
            />
          </TabPanel>

          <TabPanel px={0}>
            <SectionProductsPanel
              section="FLASH_SALE"
              description="Khối Flash Sale trên trang chủ (tối đa 6 sản phẩm)."
              showEndsAt
            />
          </TabPanel>

          <TabPanel px={0}>
            <SectionProductsPanel
              section="BEST_SELLER"
              description="Khối Top bán chạy — lưới 8 sản phẩm bên trái trang chủ."
            />
          </TabPanel>

          <TabPanel px={0}>
            <SectionProductsPanel
              section="SUGGESTED"
              description="Khối Gợi ý hôm nay — lưới 15 sản phẩm phía dưới."
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <BannerFormModal
        isOpen={bannerModal.isOpen}
        onClose={bannerModal.onClose}
        title={editingBanner ? 'Sửa slide carousel' : 'Thêm slide carousel'}
        form={bannerForm}
        onChange={setBannerForm}
        onSave={() => void saveBanner()}
        isSaving={bannerMutations.create.isPending || bannerMutations.update.isPending}
      />
    </VStack>
  )
}
