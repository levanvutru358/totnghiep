import { uploadRepository } from '../repositories/upload.repository';

const toPositive = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const resolveUploadImages = async (userId: number, raw: unknown) => {
  if (!Array.isArray(raw) || raw.length === 0) return [] as Array<{ url: string; uploadId: number | null }>;
  const out: Array<{ url: string; uploadId: number | null }> = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.startsWith('http')) {
      out.push({ url: item, uploadId: null });
      continue;
    }
    const uploadId = toPositive(item);
    if (!uploadId) continue;
    const file = await uploadRepository.getById(uploadId);
    if (!file || (file.user_id && Number(file.user_id) !== userId)) continue;
    out.push({ url: file.url, uploadId });
  }
  return out;
};
