import { notificationRepository } from '../repositories/notification.repository';

const toPositive = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const notificationService = {
  async list(userId: number, query: Record<string, unknown>) {
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 50);
    const result = await notificationRepository.list(userId, page, limit);
    return {
      ...result,
      items: result.items.map((n: any) => ({
        id: Number(n.id),
        type: n.type,
        title: n.title,
        body: n.body,
        referenceType: n.reference_type,
        referenceId: n.reference_id ? Number(n.reference_id) : null,
        isRead: Number(n.is_read) === 1,
        createdAt: n.created_at,
      })),
    };
  },

  async markRead(userId: number, notificationId: number) {
    await notificationRepository.markRead(userId, notificationId);
  },

  async markAllRead(userId: number) {
    await notificationRepository.markAllRead(userId);
  },

  async unreadCount(userId: number) {
    const count = await notificationRepository.countUnread(userId);
    return { unread: count };
  },
};
