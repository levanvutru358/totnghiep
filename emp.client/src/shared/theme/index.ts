import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  semanticTokens: {
    colors: {
      brand: {
        50: '#fff1f2',
        100: '#ffe4e6',
        200: '#fecdd3',
        300: '#fda4af',
        400: '#fb7185',
        500: '#f43f5e',
        600: '#e11d48',
        700: '#be123c',
        800: '#9f1239',
        900: '#881337',
      },
      bg: { canvas: { default: '#f6f7fb', _dark: 'gray.900' } },
      surface: {
        card: { default: 'white', _dark: 'gray.800' },
        topbar: { default: 'white', _dark: 'gray.800' },
      },
      border: {
        subtle: { default: 'blackAlpha.100', _dark: 'whiteAlpha.200' },
        muted: { default: 'gray.200', _dark: 'whiteAlpha.300' },
      },
      text: {
        primary: { default: 'gray.800', _dark: 'gray.100' },
        secondary: { default: 'gray.600', _dark: 'gray.400' },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'bg.canvas',
        color: 'text.primary',
      },
    },
  },
})

