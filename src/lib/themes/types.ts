/**
 * A theme is pure data plus two optional render hooks. Nothing in the poster
 * component knows any theme by name, so adding a fourth one means adding an
 * object to the registry in `./index.ts` and nothing else.
 *
 * Note on colours: values here are literal, never `var(--x)`. The poster SVG is
 * handed straight to the PDF writer, which reads inline styles and presentation
 * attributes without ever resolving CSS custom properties. Themes are still
 * exposed as custom properties for the surrounding app chrome (see `ui`), where
 * the cascade genuinely applies.
 */
import type { ReactNode } from 'react'
import type { PageBox } from '@/lib/paper'
import type { NodeBox } from '@/lib/tree/layout'

export interface ThemeFont {
  /**
   * Must match the SVG `font-family` and the id the font is registered under in
   * the PDF, exactly and case-sensitively — that string is the only thing tying
   * the two rendering targets to the same typeface.
   */
  family: string
  /** Fallback stack for the preview before the webfont settles. */
  fallback: string
  /**
   * TTF files in /public/fonts. Only two weights exist because the PDF writer
   * maps SVG font weights onto exactly `normal` (400) and `bold` (700).
   */
  files: { normal: string; bold: string }
  /** Width correction applied to the estimator in lib/text.ts. */
  widthScale: number
}

export interface ThemePalette {
  /** Page background. */
  paper: string
  /** Primary text. */
  ink: string
  /** Secondary text such as dates. */
  inkMuted: string
  accent: string

  nodeFill: string
  nodeStroke: string
  nodeInk: string

  /** The root person's card, drawn as the poster's focal point. */
  rootFill: string
  rootStroke: string
  rootInk: string

  /** Unknown ancestors: present in the layout, quiet on the page. */
  emptyFill: string
  emptyStroke: string
  emptyInk: string

  connector: string
  titleInk: string

  /** The plate carrying a couple's marriage, where their two lines meet. */
  plaqueFill: string
  plaqueStroke: string
  plaqueInk: string
}

export type ConnectorStyle = 'elbow' | 'curve' | 'bracket'
export type SurnameCase = 'upper' | 'normal'

export interface Theme {
  id: string
  name: string

  fonts: {
    /** Names. */
    display: ThemeFont
    /** Dates, captions, labels. */
    body: ThemeFont
  }

  palette: ThemePalette

  page: {
    /**
     * Outer margin as a multiple of the name size. The page is derived from
     * its content, so the margin scales with the type rather than the sheet.
     */
    marginScale: number
    /** Hairline weight in mm used for rules and frames. */
    hairline: number
  }

  node: {
    /** Corner radius in mm. 0 gives a sharp rectangle. */
    radius: number
    strokeWidth: number
    /** Dash pattern in mm for unknown ancestors. */
    emptyDash: string
    surnameCase: SurnameCase
    /** Letter spacing in em applied to surnames. */
    surnameTracking: number
  }

  connector: {
    style: ConnectorStyle
    strokeWidth: number
    opacity: number
    /** Corner rounding in mm, only used by the `bracket` style. */
    cornerRadius: number
    /** Radius in mm of the dot drawn where a couple's lines meet; 0 disables. */
    junctionRadius: number
    /** Opacity multiplier for lines leading to an unknown ancestor. */
    mutedOpacity: number
  }

  /**
   * Decorative layer. `defs` contributes gradients and patterns; `layer` paints
   * the page beneath the tree. Ids must be namespaced with the theme id.
   */
  background: {
    defs?: (theme: Theme) => ReactNode
    layer?: (theme: Theme, page: PageBox, margin: number) => ReactNode
  }

  /** Optional per-node flourish, drawn on top of the card. */
  nodeDecoration?: (box: NodeBox, theme: Theme) => ReactNode

}
