import { AddIcon, CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  ListItem,
  Select,
  Skeleton,
  Text,
  UnorderedList,
  VStack,
} from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  useBrandMutations,
  useBrands,
  useCategories,
  useCategoryMutations,
} from '../hooks/use-category-brand'
import {
  getCategoryDisplayLabel,
  groupCategoriesForSelect,
  normalizeTaxonomyName,
  taxonomyUi,
  type TaxonomyItem,
} from '../utils/category-brand.util'

const extractApiError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string })?.message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const CategoryBrandPage = () => {
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const categoryGroups = groupCategoriesForSelect(categories ?? [])
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations()
  const { data: brands, isLoading: brandsLoading } = useBrands()
  const { createBrand, deleteBrand } = useBrandMutations()

  const [newParentName, setNewParentName] = useState('')
  const [newChildName, setNewChildName] = useState('')
  const [parentForChild, setParentForChild] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const parentOptions = useMemo(
    () =>
      categoryGroups
        .filter((group) => group.parent.id !== '__unassigned__')
        .map((group) => ({
          id: group.parent.id,
          slug: group.parent.slug,
          label: getCategoryDisplayLabel(group.parent),
        })),
    [categoryGroups],
  )

  useEffect(() => {
    if (!parentForChild && parentOptions[0]) {
      setParentForChild(parentOptions[0].id)
    }
  }, [parentOptions, parentForChild])

  const startEdit = (item: TaxonomyItem) => {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async () => {
    if (!editingId) return
    const name = normalizeTaxonomyName(editingName)
    if (!name) return
    try {
      await updateCategory.mutateAsync({ id: editingId, name })
      toast.success(taxonomyUi.category.updateSuccessMessage)
      cancelEdit()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể cập nhật danh mục'))
    }
  }

  const handleCreateParent = async () => {
    const name = normalizeTaxonomyName(newParentName)
    if (!name) return
    try {
      await createCategory.mutateAsync({ name })
      setNewParentName('')
      toast.success(taxonomyUi.category.createSuccessMessage)
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể thêm nhóm danh mục'))
    }
  }

  const handleCreateChild = async () => {
    const name = normalizeTaxonomyName(newChildName)
    if (!name) return
    const parent = parentOptions.find((item) => item.id === parentForChild)
    if (!parent) {
      toast.error('Chọn nhóm danh mục cha')
      return
    }
    try {
      await createCategory.mutateAsync({
        name,
        parentId: parent.id,
        parentSlug: parent.slug,
      })
      setNewChildName('')
      toast.success(taxonomyUi.category.createSuccessMessage)
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể thêm loại danh mục con'))
    }
  }

  const handleDelete = async (item: TaxonomyItem, hasChildren: boolean) => {
    if (hasChildren) {
      toast.error('Xóa các loại con trước khi xóa nhóm danh mục')
      return
    }
    if (!window.confirm(`Xóa danh mục "${item.name}"?`)) return
    try {
      await deleteCategory.mutateAsync(item.id)
      toast.success(taxonomyUi.category.deleteSuccessMessage)
      if (editingId === item.id) cancelEdit()
    } catch (error) {
      toast.error(extractApiError(error, 'Không thể xóa danh mục (có thể đang được sản phẩm sử dụng)'))
    }
  }

  const handleCreateBrand = async () => {
    const name = normalizeTaxonomyName(newBrand)
    if (!name) return
    await createBrand.mutateAsync(name)
    setNewBrand('')
    toast.success(taxonomyUi.brand.createSuccessMessage)
  }

  const renderCategoryRow = (item: TaxonomyItem, isParent: boolean, hasChildren = false) => {
    const isEditing = editingId === item.id

    return (
      <HStack key={item.id} justify="space-between" pl={isParent ? 0 : 4} w="full">
        {isEditing ? (
          <Input
            size="sm"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            flex={1}
          />
        ) : (
          <Text fontSize="sm" fontWeight={isParent ? '700' : 'normal'} color={isParent ? 'text.primary' : 'text.secondary'}>
            {isParent ? getCategoryDisplayLabel(item) : item.name}
          </Text>
        )}
        <HStack flexShrink={0}>
          {isEditing ? (
            <>
              <IconButton
                aria-label="Lưu"
                size="xs"
                colorScheme="green"
                icon={<CheckIcon />}
                onClick={() => void saveEdit()}
                isLoading={updateCategory.isPending}
              />
              <IconButton aria-label="Hủy" size="xs" variant="outline" icon={<CloseIcon />} onClick={cancelEdit} />
            </>
          ) : (
            <>
              <IconButton aria-label="Sửa" size="xs" variant="outline" icon={<EditIcon />} onClick={() => startEdit(item)} />
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                onClick={() => void handleDelete(item, hasChildren)}
                isLoading={deleteCategory.isPending}
              >
                Xóa
              </Button>
            </>
          )}
        </HStack>
      </HStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Quản lý danh mục & thương hiệu</Heading>
        <Text color="text.secondary">
          Danh mục 2 cấp: nhóm (cha) và loại con. Sản phẩm gắn vào loại con khi thêm/sửa sản phẩm.
        </Text>
      </Box>

      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={5} boxShadow="sm">
          <Heading size="sm" mb={4}>
            Danh mục giày
          </Heading>

          <VStack align="stretch" spacing={4} mb={5}>
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Thêm nhóm danh mục (cha)
              </Text>
              <HStack>
                <Input
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder={taxonomyUi.category.createParentPlaceholder}
                />
                <Button leftIcon={<AddIcon />} onClick={() => void handleCreateParent()} isLoading={createCategory.isPending}>
                  Thêm
                </Button>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Thêm loại danh mục con
              </Text>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr auto' }} gap={2}>
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    Nhóm cha
                  </FormLabel>
                  <Select value={parentForChild} onChange={(e) => setParentForChild(e.target.value)} size="sm">
                    {parentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    Tên loại con
                  </FormLabel>
                  <Input
                    size="sm"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder={taxonomyUi.category.createPlaceholder}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" mb={1} visibility="hidden">
                    Thêm
                  </FormLabel>
                  <Button size="sm" leftIcon={<AddIcon />} onClick={() => void handleCreateChild()} isLoading={createCategory.isPending}>
                    Thêm
                  </Button>
                </FormControl>
              </Grid>
            </Box>
          </VStack>

          <Text fontSize="sm" color="text.secondary" mb={3}>
            {categoryGroups.length} nhóm · {categories?.filter((c) => c.parentId).length ?? 0} loại con
          </Text>

          <UnorderedList spacing={2} styleType="none" ml={0}>
            {categoriesLoading &&
              [...Array(6)].map((_, index) => (
                <ListItem key={`category-skeleton-${index}`}>
                  <Skeleton height="18px" borderRadius="md" />
                </ListItem>
              ))}
            {categoryGroups.map((group) => (
              <ListItem key={group.parent.id} mb={3}>
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Box flex={1}>{renderCategoryRow(group.parent, true, group.children.length > 0)}</Box>
                    <Badge colorScheme={taxonomyUi.category.badgeColorScheme}>Nhóm</Badge>
                  </HStack>
                  {group.children.length === 0 ? (
                    <Text fontSize="sm" color="text.secondary" pl={4}>
                      Chưa có loại con
                    </Text>
                  ) : (
                    group.children.map((item) => renderCategoryRow(item, false))
                  )}
                </VStack>
              </ListItem>
            ))}
          </UnorderedList>
        </Box>

        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={5} boxShadow="sm">
          <Heading size="sm" mb={4}>
            Thương hiệu
          </Heading>
          <HStack mb={4}>
            <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder={taxonomyUi.brand.createPlaceholder} />
            <Button leftIcon={<AddIcon />} onClick={() => void handleCreateBrand()} isLoading={createBrand.isPending}>
              Thêm
            </Button>
          </HStack>
          <UnorderedList spacing={2} styleType="none" ml={0}>
            {brandsLoading &&
              [...Array(6)].map((_, index) => (
                <ListItem key={`brand-skeleton-${index}`}>
                  <Skeleton height="18px" borderRadius="md" />
                </ListItem>
              ))}
            {(brands ?? []).map((item) => (
              <ListItem key={item.id}>
                <HStack justify="space-between">
                  <Text>{item.name}</Text>
                  <HStack>
                    <Badge colorScheme={taxonomyUi.brand.badgeColorScheme}>{taxonomyUi.brand.badgeLabel}</Badge>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => deleteBrand.mutate(item.id)}
                      isLoading={deleteBrand.isPending}
                    >
                      Xóa
                    </Button>
                  </HStack>
                </HStack>
              </ListItem>
            ))}
          </UnorderedList>
        </Box>
      </Grid>
    </VStack>
  )
}
