import { cardAnatomy } from '@chakra-ui/anatomy'
import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(cardAnatomy.keys)

const baseStyle = definePartsStyle({
  container: {
    borderRadius: 'xl',
    borderWidth: '1px',
    borderColor: 'blackAlpha.100',
    bg: 'surface.card',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
    _dark: { borderColor: 'gray.700' },
  },
})

export const cardTheme = defineMultiStyleConfig({
  baseStyle,
})
