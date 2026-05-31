import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HamburgerIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from '@chakra-ui/icons'
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { useAuthStore } from '../../app/store/app.store'

interface AppTopbarProps {
  onOpenSidebar: () => void
  isSidebarCollapsed: boolean
  onToggleSidebarCollapse: () => void
}

export const AppTopbar = ({ onOpenSidebar, isSidebarCollapsed, onToggleSidebarCollapse }: AppTopbarProps) => {
  const { colorMode, toggleColorMode } = useColorMode()
  const { user, logout } = useAuthStore()

  return (
    <Flex
      px={5}
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="surface.topbar"
      backdropFilter="saturate(180%) blur(10px)"
      align="center"
      justify="space-between"
      gap={4}
    >
      <HStack gap={3}>
        <IconButton
          aria-label="Mở điều hướng"
          icon={<HamburgerIcon />}
          onClick={onOpenSidebar}
          variant="outline"
          display={{ base: 'inline-flex', lg: 'none' }}
        />
        <IconButton
          aria-label={isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          icon={isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          onClick={onToggleSidebarCollapse}
          variant="outline"
          display={{ base: 'none', lg: 'inline-flex' }}
        />
        <InputGroup maxW={{ base: '180px', md: '360px' }}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Tìm đơn hàng, sản phẩm..."
            aria-label="Tìm dữ liệu quản trị"
            bg="surface.input"
            borderRadius="xl"
            borderColor="border.muted"
          />
        </InputGroup>
      </HStack>

      <HStack gap={2}>
        <IconButton aria-label="Thông báo" icon={<BellIcon />} variant="ghost" />
        <IconButton
          aria-label="Chuyển chế độ sáng tối"
          icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          variant="ghost"
        />
        <Menu>
          <MenuButton as={Box} cursor="pointer" px={3} py={2} borderRadius="md" _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}>
            <Text fontSize="sm" fontWeight="600">{user?.name ?? 'Quản trị viên'}</Text>
          </MenuButton>
          <MenuList>
            <MenuItem onClick={logout}>Đăng xuất</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  )
}
