import { Box, Drawer, DrawerContent, DrawerOverlay, Flex, useDisclosure } from '@chakra-ui/react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'

export const AdminLayout = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <Flex minH="100vh" bg="bg.canvas">
      <Box
        w={isSidebarCollapsed ? '16' : '64'}
        transition="width 0.2s ease"
        display={{ base: 'none', lg: 'block' }}
        position="sticky"
        top={0}
        h="100vh"
      >
        <AppSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)} />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="64">
          <AppSidebar onNavigate={onClose} />
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex={1} minW={0}>
        <AppTopbar
          onOpenSidebar={onOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <Box as="main" p={{ base: 4, md: 6 }}>
          <Box maxW="1600px" mx="auto">
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  )
}
