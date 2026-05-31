import { Box, Button, Checkbox, Input, Text } from '@chakra-ui/react'

export interface PhoneAuthPanelProps {
  phone: string
  onPhoneChange: (value: string) => void
  agreed: boolean
  onAgreedChange: (value: boolean) => void
  canContinue: boolean
  onContinue?: () => void
  onSwitchToEmail: () => void
}

export const PhoneAuthPanel = ({
  phone,
  onPhoneChange,
  agreed,
  onAgreedChange,
  canContinue,
  onContinue,
  onSwitchToEmail,
}: PhoneAuthPanelProps) => {
  return (
    <>
      <Box>
        <Text fontWeight="700" mb={2} color="text.secondary">
          Số điện thoại
        </Text>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Nhập số điện thoại"
          inputMode="numeric"
          bg="white"
          borderColor="border.muted"
        />
      </Box>

      <Checkbox isChecked={agreed} onChange={(e) => onAgreedChange(e.target.checked)} colorScheme="pink">
        <Text fontSize="xs" color="text.secondary">
          Bằng việc tiếp tục, bạn đã đọc và đồng ý với{' '}
          <Text as="span" color="blue.600" fontWeight="700">
            điều khoản sử dụng
          </Text>{' '}
          và{' '}
          <Text as="span" color="blue.600" fontWeight="700">
            Chính sách bảo mật thông tin cá nhân
          </Text>{' '}
          của DTT Shop
        </Text>
      </Checkbox>

      <Button
        colorScheme="pink"
        bg={canContinue ? 'brand.600' : 'gray.200'}
        _hover={canContinue ? { bg: 'brand.700' } : undefined}
        isDisabled={!canContinue}
        height="44px"
        fontWeight="800"
        onClick={onContinue}
      >
        Tiếp tục
      </Button>

      <Button variant="link" color="blue.600" fontWeight="700" onClick={onSwitchToEmail}>
        Đăng nhập bằng email
      </Button>
    </>
  )
}

