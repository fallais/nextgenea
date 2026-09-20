/**
 * Page geometry.
 *
 * There are no fixed paper sizes. A pedigree has a natural shape — so many
 * leaves by so many generations — and forcing it onto an A-series sheet either
 * wastes paper or crushes the type. Instead the page is derived from the
 * content: cards are sized so that no surname is ever abbreviated, and the
 * sheet is whatever those cards add up to.
 *
 * The sheet is never clipped to suit an output format. SVG has no size limit,
 * so the drawing is always complete; it is the PDF writer that has to cope,
 * and the helpers below say how far it can stretch.
 */

export interface PageBox {
  /** Page width in mm. */
  w: number
  /** Page height in mm. */
  h: number
}

export const PT_PER_MM = 72 / 25.4

/** A PDF MediaBox side maxes out at 14400 points, i.e. 200 inches. */
export const PDF_MAX_POINTS = 14400
export const PDF_MAX_MM = PDF_MAX_POINTS / PT_PER_MM

/**
 * PDF 1.6 added /UserUnit, a multiplier on the page's coordinate space, which
 * lifts the ceiling to 75000 × 200 inches. Support is uneven: Acrobat honours
 * it, but plenty of viewers ignore it and present the page at its raw MediaBox
 * size, which would print the poster at 1/UserUnit scale.
 */
export const PDF_MAX_USER_UNIT = 75000

/** Sanity ceiling. Half a kilometre of paper is a bug, not a poster. */
export const MAX_PAGE_MM = 500_000

/** The /UserUnit multiplier this page needs; 1 when it fits unaided. */
export function userUnitFor(page: PageBox): number {
  const longest = Math.max(page.w, page.h)
  if (longest <= PDF_MAX_MM) return 1
  return Math.ceil(longest / PDF_MAX_MM)
}

/** Whether a PDF can represent this page at all, even with /UserUnit. */
export function fitsInPdf(page: PageBox): boolean {
  return userUnitFor(page) <= PDF_MAX_USER_UNIT
}

export function describePageBox(page: PageBox): string {
  const round = (v: number) => Math.round(v)
  if (Math.max(page.w, page.h) >= 10_000) {
    const m = (v: number) => (v / 1000).toFixed(2).replace(/\.?0+$/, '')
    return `${m(page.w)} × ${m(page.h)} m`
  }
  return `${round(page.w)} × ${round(page.h)} mm`
}

/** Nearest ISO A size that would contain the page, purely as a hint for print. */
export function nearestStandard(page: PageBox): string | null {
  const sizes: [string, number, number][] = [
    ['A4', 210, 297], ['A3', 297, 420], ['A2', 420, 594],
    ['A1', 594, 841], ['A0', 841, 1189], ['2A0', 1189, 1682],
  ]
  const short = Math.min(page.w, page.h)
  const long = Math.max(page.w, page.h)
  for (const [name, s, l] of sizes) {
    if (short <= s && long <= l) return name
  }
  return null
}
