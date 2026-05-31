export const parseDeviceLabel = (userAgent?: string | null): string => {
  if (!userAgent?.trim()) return 'Không rõ';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iPhone / iPad';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('mobile')) return 'Di động';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Máy tính';
};

export const getClientIp = (req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string | null => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0]?.trim() ?? null;
  if (Array.isArray(forwarded) && forwarded[0]) return String(forwarded[0]).split(',')[0]?.trim() ?? null;
  return req.ip ?? null;
};
