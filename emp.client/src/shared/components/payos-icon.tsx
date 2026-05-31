import { Box, Text } from '@chakra-ui/react'

type PayOsIconProps = {
  size?: number
}

export const PayOsIcon = ({ size = 42 }: PayOsIconProps) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    borderRadius="xl"
    bg="white"
    borderWidth="1px"
    borderColor="green.100"
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
  >
    <Text fontWeight="900" fontSize="xs" color="green.600" letterSpacing="tight">
      PayOS
    </Text>
  </Box>
)
