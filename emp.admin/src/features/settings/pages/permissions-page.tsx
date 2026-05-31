import {
  Badge,
  Box,
  Button,
  Checkbox,
  Grid,
  GridItem,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { authApi } from '../../auth/services/auth.api'

export const PermissionsPage = () => {
  const queryClient = useQueryClient()
  const rolePermissionsQuery = useQuery({
    queryKey: ['role-permissions'],
    queryFn: authApi.getRolePermissions,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { roleCode: string; permissionCodes: string[] }) => {
      await authApi.updateRolePermissions(payload.roleCode, payload.permissionCodes)
    },
    onSuccess: () => {
      toast.success('Cập nhật phân quyền thành công')
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
    },
    onError: () => toast.error('Cập nhật phân quyền thất bại'),
  })

  const matrix = useMemo(() => {
    const allPermissions = rolePermissionsQuery.data?.allPermissions ?? []
    const roles = rolePermissionsQuery.data?.roles ?? []
    return { allPermissions, roles }
  }, [rolePermissionsQuery.data])

  if (rolePermissionsQuery.isLoading) {
    return (
      <HStack justify="center" py={16}>
        <Spinner />
      </HStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Quản lý phân quyền trang Admin</Heading>
        <Text color="text.secondary">Bật/tắt quyền hiển thị trang theo từng role (không dùng user-permission).</Text>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(3, 1fr)' }} gap={4}>
        {matrix.roles
          .filter((r) => r.role !== 'CUSTOMER')
          .map((roleRow) => {
            const selected = new Set(roleRow.permissions)
            return (
              <GridItem key={roleRow.role}>
                <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
                  <HStack justify="space-between" mb={3}>
                    <Heading size="sm">{roleRow.role}</Heading>
                    <Badge colorScheme={roleRow.role === 'SUPER_ADMIN' ? 'purple' : 'blue'}>{selected.size} quyền</Badge>
                  </HStack>

                  <VStack align="stretch" gap={2} maxH="320px" overflowY="auto" pr={1}>
                    {matrix.allPermissions.map((permissionCode) => (
                      <Checkbox
                        key={`${roleRow.role}-${permissionCode}`}
                        isChecked={selected.has(permissionCode)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(permissionCode)
                          else next.delete(permissionCode)
                          updateMutation.mutate({
                            roleCode: roleRow.role,
                            permissionCodes: Array.from(next),
                          })
                        }}
                        isDisabled={updateMutation.isPending}
                      >
                        {permissionCode}
                      </Checkbox>
                    ))}
                  </VStack>
                  <Button
                    mt={4}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateMutation.mutate({
                        roleCode: roleRow.role,
                        permissionCodes: roleRow.permissions,
                      })
                    }
                    isLoading={updateMutation.isPending}
                  >
                    Đồng bộ lại
                  </Button>
                </Box>
              </GridItem>
            )
          })}
      </Grid>
    </VStack>
  )
}
