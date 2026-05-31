export const ADMIN_PANEL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'] as const

export const isAdminPanelRole = (role: string): boolean =>
  ADMIN_PANEL_ROLES.includes(role as (typeof ADMIN_PANEL_ROLES)[number])
