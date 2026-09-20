/**
 * Loading the theme's typefaces for export.
 *
 * Both exporters need the same bytes: the PDF writer embeds them as font
 * programs, and the SVG writer inlines them as base64 `@font-face` rules so the
 * file stands alone on a machine that has never seen these faces.
 */
import type { Theme } from './themes/types'

export interface FaceRef {
  family: string
  /** jsPDF style slot. Only these two exist — see themes/fonts.ts. */
  style: 'normal' | 'bold'
  weight: 400 | 700
  url: string
}

/** The faces a theme actually uses, de-duplicated. */
export function facesFor(theme: Theme): FaceRef[] {
  const wanted: FaceRef[] = [
    {
      family: theme.fonts.display.family,
      style: 'normal',
      weight: 400,
      url: theme.fonts.display.files.normal,
    },
    {
      family: theme.fonts.display.family,
      style: 'bold',
      weight: 700,
      url: theme.fonts.display.files.bold,
    },
    {
      family: theme.fonts.body.family,
      style: 'normal',
      weight: 400,
      url: theme.fonts.body.files.normal,
    },
    {
      family: theme.fonts.body.family,
      style: 'bold',
      weight: 700,
      url: theme.fonts.body.files.bold,
    },
  ]

  const seen = new Set<string>()
  return wanted.filter((face) => {
    const key = `${face.family}|${face.style}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Chunked so a ~100kB font does not blow the argument limit of `fromCharCode`. */
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function fetchFaceBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load font ${url}`)
  return toBase64(await response.arrayBuffer())
}

/**
 * Wait for the webfonts to arrive. Both writers measure text with the browser's
 * own metrics to place each run, so converting mid-load would position type
 * against fallback metrics.
 */
export async function waitForFonts(theme: Theme): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const families = [theme.fonts.display.family, theme.fonts.body.family]
  await Promise.all(
    families.flatMap((family) =>
      [400, 700].map((weight) =>
        document.fonts.load(`${weight} 16px "${family}"`).catch(() => undefined),
      ),
    ),
  )
  await document.fonts.ready
}

/**
 * Ligatures and stroked letters that Unicode decomposition leaves untouched:
 * NFD will not take these apart, so they have to be spelled out by hand.
 */
const TRANSLITERATIONS: Record<string, string> = {
  'ß': 'ss', // eszett
  'æ': 'ae',
  'Æ': 'ae',
  'œ': 'oe',
  'Œ': 'oe',
  'ø': 'o',
  'Ø': 'o',
  'ł': 'l',
  'Ł': 'l',
  'đ': 'd',
  'Đ': 'd',
  'þ': 'th',
  'Þ': 'th',
  'ð': 'd',
  'Ð': 'd',
}

export function posterFileName(
  rootName: string,
  generations: number,
  extension: 'pdf' | 'svg',
): string {
  const slug =
    rootName
      .replace(/[^\u0000-\u007f]/g, (ch) => TRANSLITERATIONS[ch] ?? ch)
      .normalize('NFD')
      // Strip the combining marks NFD just separated out.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'ancestors'
  return `${slug}-${generations}-generations.${extension}`
}

/** Hand a generated file to the browser as a download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick, once the download has begun.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
