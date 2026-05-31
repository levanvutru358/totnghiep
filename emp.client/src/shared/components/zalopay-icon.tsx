import { Box } from '@chakra-ui/react'

type ZaloPayIconProps = {
  size?: number
}

export const ZaloPayIcon = ({ size = 42 }: ZaloPayIconProps) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    borderRadius="xl"
    bg="white"
    borderWidth="1px"
    borderColor="blue.100"
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
    overflow="hidden"
  >
    <Box
      as="svg"
      viewBox="0 0 48 48"
      w="full"
      h="full"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="10" fill="#008FE5" />
      <path
        d="M14 30c0-6.627 5.373-12 12-12h8v-4H26C16.059 14 8 22.059 8 32s8.059 18 18 18h6v-4h-6c-6.627 0-12-5.373-12-12z"
        fill="#fff"
      />
      <circle cx="34" cy="18" r="4" fill="#fff" />
    </Box>
  </Box>
)
