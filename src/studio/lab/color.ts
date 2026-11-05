/** WCAG contrast helpers for six-digit hex colours. */
export const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Hue (0-360), saturation and lightness (0-1). */
export function hsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  if (!d) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}
