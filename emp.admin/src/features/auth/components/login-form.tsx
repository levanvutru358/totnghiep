import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Button, FormControl, FormErrorMessage, FormLabel, Input, VStack } from '@chakra-ui/react'
import { toast } from 'react-hot-toast'
import { ROUTES } from '../../../app/router/route-names'
import { loginSchema, type LoginFormData } from '../schemas/login.schema'
import { useLogin } from '../hooks/use-login'

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data)
      toast.success('Đăng nhập thành công!')
      navigate(ROUTES.DASHBOARD)
    } catch (error) {
      toast.error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={Boolean(errors.email?.message)}>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            placeholder="admin@emp.local"
            autoComplete="email"
            size="lg"
            borderRadius="xl"
            {...register('email')}
          />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.password?.message)}>
          <FormLabel>Mật khẩu</FormLabel>
          <Input
            type="password"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            size="lg"
            borderRadius="xl"
            {...register('password')}
          />
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          isLoading={loginMutation.isPending}
          colorScheme="blue"
          size="lg"
          borderRadius="xl"
        >
          Đăng nhập
        </Button>
      </VStack>
    </form>
  )
}