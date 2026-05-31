export {}

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string
        cookie?: boolean
        xfbml?: boolean
        version: string
      }) => void
      login: (
        callback: (response: any) => void,
        options?: {
          scope?: string
        },
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

