import React from 'react'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { BrandLogo } from '../../../shared/components/brand-logo'
import { LoginForm } from '../components/login-form'

export const LoginPage: React.FC = () => {
  return (
    <Flex minH="100vh" bg="gray.50" px={{ base: 4, md: 6 }} py={10} align="center">
      <Flex w="full" maxW="560px" mx="auto" direction="column" gap={6}>
        <Box borderWidth="1px" borderColor="gray.200" bg="white" rounded="2xl" p={{ base: 6, md: 8 }} shadow="sm">
          <Box mb={6}>
            <VStack spacing={3} mb={2}>
              <BrandLogo h="48px" maxW="180px" mx="auto" />
            </VStack>
            <Heading textAlign="center" size="lg" color="gray.900">Đăng nhập hệ thống</Heading>
            <Text mt={2} textAlign="center" fontSize="sm" color="gray.600">Truy cập trang quản trị</Text>
          </Box>
          <LoginForm />
        </Box>
      </Flex>
    </Flex>
  )
}