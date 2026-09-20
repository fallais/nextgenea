/**
 * The typefaces available to themes.
 *
 * Each entry names the exact family string used in three places that must
 * agree: the SVG `font-family` attribute, the `@font-face` rule that loads the
 * preview webfont, and the id the face is registered under inside the PDF.
 *
 * Only two weights exist per family because the PDF writer collapses SVG font
 * weights onto `normal` (400) and `bold` (700); a 600 would be looked up under
 * a style name that is never registered and silently fall back to Times. The
 * "bold" slot therefore holds each family's SemiBold where that reads better.
 *
 * Files are produced by `npm run fonts` (scripts/fetch-fonts.mjs).
 */
import type { ThemeFont } from './types'

export const EB_GARAMOND: ThemeFont = {
  family: 'EB Garamond',
  fallback: "EB Garamond, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
  files: {
    normal: '/fonts/EBGaramond-Regular.ttf',
    bold: '/fonts/EBGaramond-SemiBold.ttf',
  },
  widthScale: 0.93,
}

export const IBM_PLEX_SANS: ThemeFont = {
  family: 'IBM Plex Sans',
  fallback: "IBM Plex Sans, 'Helvetica Neue', Arial, sans-serif",
  files: {
    normal: '/fonts/IBMPlexSans-Regular.ttf',
    bold: '/fonts/IBMPlexSans-SemiBold.ttf',
  },
  widthScale: 1.02,
}

export const IBM_PLEX_MONO: ThemeFont = {
  family: 'IBM Plex Mono',
  fallback: "IBM Plex Mono, ui-monospace, 'SFMono-Regular', Menlo, monospace",
  // Only the regular weight ships; the theme never asks this family for bold.
  files: {
    normal: '/fonts/IBMPlexMono-Regular.ttf',
    bold: '/fonts/IBMPlexMono-Regular.ttf',
  },
  widthScale: 1.16,
}

export const CORMORANT: ThemeFont = {
  family: 'Cormorant Garamond',
  fallback: "Cormorant Garamond, 'Times New Roman', Times, serif",
  files: {
    normal: '/fonts/Cormorant-Regular.ttf',
    bold: '/fonts/Cormorant-SemiBold.ttf',
  },
  widthScale: 0.86,
}

export const KARLA: ThemeFont = {
  family: 'Karla',
  fallback: "Karla, 'Helvetica Neue', Arial, sans-serif",
  files: {
    normal: '/fonts/Karla-Regular.ttf',
    bold: '/fonts/Karla-Bold.ttf',
  },
  widthScale: 0.97,
}

/** Every face the app can load, de-duplicated by file path. */
export const ALL_FONTS: ThemeFont[] = [
  EB_GARAMOND,
  IBM_PLEX_SANS,
  IBM_PLEX_MONO,
  CORMORANT,
  KARLA,
]
