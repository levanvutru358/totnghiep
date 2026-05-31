type FacebookSdkStatus = 'idle' | 'loading' | 'ready' | 'error'

let status: FacebookSdkStatus = 'idle'
let loadingPromise: Promise<void> | null = null

const ensureScript = (appId: string) => {
  if (document.getElementById('facebook-jssdk')) return
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  document.body.appendChild(script)

  ;(window as any).fbAsyncInit = () => {
    if (!window.FB) {
      status = 'error'
      return
    }
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: 'v20.0',
    })
    status = 'ready'
  }
}

export async function loadFacebookSdk(appId: string): Promise<void> {
  if (!appId) throw new Error('MISSING_FACEBOOK_APP_ID')
  if (status === 'ready') return
  if (status === 'loading' && loadingPromise) return loadingPromise

  status = 'loading'
  ensureScript(appId)

  loadingPromise = new Promise<void>((resolve, reject) => {
    const startedAt = Date.now()
    const tick = () => {
      if (status === 'ready') return resolve()
      if (status === 'error') return reject(new Error('FACEBOOK_SDK_LOAD_FAILED'))
      if (Date.now() - startedAt > 12000) return reject(new Error('FACEBOOK_SDK_TIMEOUT'))
      setTimeout(tick, 100)
    }
    tick()
  })

  return loadingPromise
}

export async function facebookLogin(appId: string): Promise<{ accessToken: string; userID: string }> {
  await loadFacebookSdk(appId)

  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('FACEBOOK_SDK_NOT_READY'))
      return
    }
    window.FB.login(
      (response: any) => {
        const authResponse = response?.authResponse
        if (!authResponse?.accessToken || !authResponse?.userID) {
          reject(new Error('FACEBOOK_LOGIN_CANCELLED'))
          return
        }
        resolve({ accessToken: authResponse.accessToken, userID: authResponse.userID })
      },
      { scope: 'public_profile,email' },
    )
  })
}

