import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { badgeTheme } from './overrides/badge'
import { buttonTheme } from './overrides/button'
import { cardTheme } from './overrides/card'
import { tableTheme } from './overrides/table'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: 'bg.canvas',
        color: 'text.primary',
      },
    },
  },
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  semanticTokens: {
    colors: {
      brand: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
      },
      success: { default: '#2f855a', _dark: '#48bb78' },
      warning: { default: '#b7791f', _dark: '#f6ad55' },
      error: { default: '#c53030', _dark: '#fc8181' },
      bg: { canvas: { default: '#f4f7fb', _dark: 'gray.900' } },
      surface: {
        card: { default: 'white', _dark: 'gray.800' },
        input: { default: 'white', _dark: 'gray.700' },
        topbar: { default: 'rgba(255,255,255,0.85)', _dark: 'rgba(26,32,44,0.82)' },
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
  components: {
    Button: buttonTheme,
    Card: cardTheme,
    Table: tableTheme,
    Badge: badgeTheme,
  },
})
