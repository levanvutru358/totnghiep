import type { ComponentStyleConfig } from '@chakra-ui/react'

export const tableTheme: ComponentStyleConfig = {
  variants: {
    simple: {
      th: {
        textTransform: 'none',
        fontSize: 'xs',
        letterSpacing: '0.02em',
        fontWeight: '700',
        color: 'text.secondary',
        borderColor: 'border.muted',
        bg: 'blackAlpha.50',
        _dark: {
          color: 'gray.300',
          borderColor: 'whiteAlpha.300',
          bg: 'whiteAlpha.100',
        },
      },
      td: {
        borderColor: 'border.subtle',
        py: 3.5,
        _dark: {
          borderColor: 'whiteAlpha.200',
        },
      },
    },
  },
}
