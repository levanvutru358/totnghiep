import { Box, Divider, Flex, Grid, Icon, IconButton, Text, Tooltip, VStack } from '@chakra-ui/react'
import { BrandLogo } from '../components/brand-logo'
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { NavLink } from 'react-router-dom'
import { navigationSections } from './navigation'
import { ROUTES } from '../../app/router/route-names'
import { useAuthStore } from '../../app/store/app.store'

interface AppSidebarProps {
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const AppSidebar = ({ onNavigate, isCollapsed = false, onToggleCollapse }: AppSidebarProps) => {
  const { hasPermission } = useAuthStore()
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <Flex direction="column" h="full" bg="surface.card" borderRightWidth="1px" borderColor="border.subtle">
      <Box px={isCollapsed ? 2 : 3} py={3} borderBottomWidth="1px" borderColor="border.muted">
        {isCollapsed ? (
          <VStack spacing={2} align="center">
            <Flex align="center" justify="center" w="full" minH="42px">
              <BrandLogo h="28px" maxW="100%" w="auto" mx="auto" display="block" />
            </Flex>
            {onToggleCollapse && (
              <IconButton
                aria-label="Expand sidebar"
                icon={<ChevronRightIcon />}
                size="sm"
                variant="ghost"
                onClick={onToggleCollapse}
              />
            )}
          </VStack>
        ) : (
          <Grid templateColumns="1fr auto" alignItems="center" columnGap={1}>
            <Flex align="center" justify="center" minH="42px" w="full" pr={1}>
              <BrandLogo h="42px" maxW="100%" w="auto" mx="auto" display="block" />
            </Flex>
            {onToggleCollapse && (
              <IconButton
                aria-label="Collapse sidebar"
                icon={<ChevronLeftIcon />}
                size="sm"
                variant="ghost"
                onClick={onToggleCollapse}
              />
            )}
          </Grid>
        )}
      </Box>
      <VStack align="stretch" gap={3} p={2}>
        {visibleSections.map((section, sectionIndex) => (
          <Box key={section.title}>
            {!isCollapsed && (
              <Text px={3} pb={2} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase">
                {section.title}
              </Text>
            )}
            <VStack align="stretch" gap={1}>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={onNavigate} end={item.to === ROUTES.DASHBOARD}>
                  {({ isActive }) => (
                    <Tooltip label={isCollapsed ? item.label : ''} placement="right" isDisabled={!isCollapsed}>
                      <Flex
                        px={3}
                        py={2.5}
                        borderRadius="xl"
                        bg={isActive ? 'brand.500' : 'transparent'}
                        color={isActive ? 'white' : 'text.primary'}
                        _hover={{ bg: isActive ? 'brand.500' : 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
                        align="center"
                        justify={isCollapsed ? 'center' : 'flex-start'}
                        gap={3}
                        transition="all .2s ease"
                      >
                        <Icon
                          as={item.icon}
                          boxSize={4}
                          minW={4}
                          color={isActive ? 'white' : 'text.secondary'}
                        />
                        {!isCollapsed && <Text fontSize="sm" fontWeight="700">{item.label}</Text>}
                      </Flex>
                    </Tooltip>
                  )}
                </NavLink>
              ))}
            </VStack>
            {!isCollapsed && sectionIndex < visibleSections.length - 1 && <Divider mt={3} borderColor="border.muted" />}
          </Box>
        ))}
      </VStack>
    </Flex>
  )
}
