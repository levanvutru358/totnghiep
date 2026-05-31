export const NOTIFICATIONS_UPDATED_EVENT = 'emp:notifications-updated'

export const dispatchNotificationsUpdated = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT))
}
