export type ProductColorImageInput = {
  color: string;
  imageUrls: string[];
};

export const parseProductColorImagesField = (body: Record<string, unknown>): ProductColorImageInput[] => {
  const raw = body.colorImages ?? body.colorImageGroups;
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const result: ProductColorImageInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const color = typeof record.color === 'string' ? record.color.trim() : '';
    if (!color) continue;

    const urlsRaw = record.imageUrls ?? record.images;
    const imageUrls = Array.isArray(urlsRaw)
      ? urlsRaw.map((url) => String(url).trim()).filter(Boolean)
      : [];

    if (imageUrls.length === 0) continue;
    result.push({ color, imageUrls });
  }

  return result;
};
