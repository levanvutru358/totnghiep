export const parseProductImageUrlsField = (body: Record<string, unknown>): string[] => {
  const raw = body.imageUrls ?? body.imageUrl ?? body.thumbnailUrl;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

export const mergeProductImageUrls = (urlList: string[], uploadedUrls: string[]): string[] => {
  const merged = [...urlList, ...uploadedUrls].map((url) => url.trim()).filter(Boolean);
  return Array.from(new Set(merged));
};
