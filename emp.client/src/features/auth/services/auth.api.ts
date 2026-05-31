import { clientAuthApi } from './client-auth.api'

/** @deprecated Prefer clientAuthApi */
export const authApi = {
  login: clientAuthApi.login,
  logout: clientAuthApi.logout,
}
