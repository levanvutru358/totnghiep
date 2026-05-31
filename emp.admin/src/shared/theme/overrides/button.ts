import type { ComponentStyleConfig } from '@chakra-ui/react'

export const buttonTheme: ComponentStyleConfig = {
  baseStyle: {
    fontWeight: '600',
    borderRadius: 'lg',
    h: 10,
  },
  variants: {
    solid: {
      bg: 'brand.500',
      color: 'white',
      boxShadow: '0 8px 18px rgba(79,70,229,0.25)',
      _hover: { bg: 'brand.600', transform: 'translateY(-1px)' },
      _active: { bg: 'brand.700' },
      _dark: {
        bg: 'brand.400',
        color: 'gray.900',
        _hover: { bg: 'brand.300' },
        _active: { bg: 'brand.500' },
      },
    },
    outline: {
      borderColor: 'border.muted',
      bg: 'surface.input',
      color: 'text.primary',
      _hover: { bg: 'blackAlpha.50' },
      _dark: {
        borderColor: 'whiteAlpha.300',
        bg: 'gray.700',
        color: 'gray.100',
        _hover: { bg: 'gray.600' },
      },
    },
  },
  defaultProps: {
    variant: 'solid',
  },
}
