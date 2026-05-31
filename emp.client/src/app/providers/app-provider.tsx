import React from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { theme } from '../../shared/theme'
import { CommerceProvider } from '../../features/commerce/context/commerce-context'
import { ShopSettingsProvider } from '../../features/settings/context/shop-settings-context'

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <ShopSettingsProvider>
          <CommerceProvider>{children}</CommerceProvider>
        </ShopSettingsProvider>
      </BrowserRouter>
    </ChakraProvider>
  )
}

