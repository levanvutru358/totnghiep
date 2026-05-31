import type { AxiosRequestConfig } from 'axios'

/** Axios gửi FormData đúng boundary (không ép JSON). */
export const multipartConfig = (): AxiosRequestConfig => ({
  headers: { 'Content-Type': 'multipart/form-data' },
  transformRequest: [
    (data, headers) => {
      if (data instanceof FormData && headers) {
        delete headers['Content-Type']
      }
      return data
    },
  ],
})
