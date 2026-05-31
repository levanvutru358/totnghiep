/** Parse strings like 15m, 1h, 7d into milliseconds. Defaults to 7d if invalid. */
export const parseDurationToMs = (input: string): number => {
  const s = input.trim();
  const m = /^(\d+)(ms|s|m|h|d)$/i.exec(s);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (mult[unit] ?? mult.d);
};
