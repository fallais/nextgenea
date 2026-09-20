/**
 * Deterministic text metrics.
 *
 * Truncation decisions have to be baked into the SVG itself, because the very
 * same SVG element is what gets handed to the PDF writer. Measuring via the DOM
 * would make the result depend on when webfonts finished loading, so instead we
 * estimate advance widths from a per-character table. It is approximate, but it
 * is identical on screen and in print, which is the property that matters.
 */

/** Advance width as a fraction of the em, for a typical text face. */
const NARROW: Record<string, number> = {
  ' ': 0.26, '.': 0.26, ',': 0.26, ':': 0.26, ';': 0.26, '!': 0.28, '|': 0.26,
  "'": 0.20, '’': 0.20, '`': 0.26, '(': 0.32, ')': 0.32, '[': 0.32, ']': 0.32,
  i: 0.26, j: 0.26, l: 0.26, t: 0.34, f: 0.32, r: 0.36, I: 0.32,
  '-': 0.35, '–': 0.5, '—': 0.75, '/': 0.35, '·': 0.3,
}

const WIDE: Record<string, number> = {
  m: 0.83, w: 0.72, M: 0.86, W: 0.92, '…': 0.9, '@': 0.95,
}

function charWidth(ch: string): number {
  const narrow = NARROW[ch]
  if (narrow !== undefined) return narrow
  const wide = WIDE[ch]
  if (wide !== undefined) return wide
  if (ch >= 'A' && ch <= 'Z') return 0.68
  if (ch >= '0' && ch <= '9') return 0.52
  // Accented capitals sit in the uppercase band; everything else is lowercase-ish.
  if (ch !== ch.toLowerCase() && ch === ch.toUpperCase()) return 0.68
  return 0.52
}

export interface TextStyle {
  /** Font size in mm. */
  size: number
  /** Per-family width correction; 1 is a neutral sans. */
  widthScale: number
  /** Letter spacing in em, matching the SVG `letter-spacing` attribute. */
  tracking?: number
}

/** Estimated rendered width in mm. */
export function measureText(text: string, style: TextStyle): number {
  if (!text) return 0
  let em = 0
  for (const ch of text) em += charWidth(ch)
  const tracking = (style.tracking ?? 0) * Math.max(0, [...text].length - 1)
  return (em + tracking) * style.size * style.widthScale
}

/** Truncate with an ellipsis so the result fits `maxWidth` mm. */
export function fitText(text: string, maxWidth: number, style: TextStyle): string {
  if (!text) return ''
  if (measureText(text, style) <= maxWidth) return text

  const chars = [...text]
  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measureText(chars.slice(0, mid).join('').trimEnd() + '…', style) <= maxWidth) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }

  const kept = chars.slice(0, lo).join('').trimEnd()
  return kept ? `${kept}…` : ''
}

/**
 * Shorten a given name without ever reaching for an ellipsis: drop to the first
 * name plus initials, then to the first name alone. Cards are sized from the
 * longest first name, so the last step always fits.
 */
export function shortenGivenName(given: string, maxWidth: number, style: TextStyle): string {
  if (!given) return ''
  if (measureText(given, style) <= maxWidth) return given

  const words = given.split(' ').filter(Boolean)
  if (words.length > 1) {
    const initialised = [words[0], ...words.slice(1).map((w) => `${[...w][0]}.`)].join(' ')
    if (measureText(initialised, style) <= maxWidth) return initialised
  }
  return words[0] ?? given
}

/** Just the first name, which is what card widths are budgeted against. */
export function firstGivenName(given: string): string {
  return given.split(' ').filter(Boolean)[0] ?? ''
}

/**
 * Places shorten by dropping the outer administrative levels — "Rouen,
 * Seine-Maritime, France" becomes "Rouen, Seine-Maritime" then "Rouen".
 *
 * If even the locality will not fit, the place is dropped entirely rather than
 * cut mid-word: "Berwick-upon-Twe…" is neither useful nor good-looking, and a
 * poster is not the place to read a truncated toponym.
 */
export function shortenPlace(place: string, maxWidth: number, style: TextStyle): string {
  if (!place) return ''
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean)
  for (let keep = parts.length; keep > 0; keep--) {
    const candidate = parts.slice(0, keep).join(', ')
    if (measureText(candidate, style) <= maxWidth) return candidate
  }
  return ''
}
