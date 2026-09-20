/**
 * Client-side PDF export.
 *
 * Takes the live poster SVG straight out of the DOM and writes it into a PDF as
 * vector geometry with the theme's fonts embedded - no rasterisation, no server
 * round-trip, and no second rendering pass that could disagree with the
 * preview. jsPDF and the SVG writer are imported dynamically so neither is in
 * the initial bundle.
 *
 * Large sheets are handled with /UserUnit; see `scaleFor` below.
 */
import type { jsPDF } from 'jspdf'
import { facesFor, toBase64, waitForFonts } from '@/lib/fonts'
import type { PageBox } from '@/lib/paper'
import { userUnitFor } from '@/lib/paper'
import type { Theme } from '@/lib/themes/types'

export { posterFileName } from '@/lib/fonts'

/**
 * Embed the theme's faces. The family string registered here has to match the
 * SVG's `font-family` exactly - the SVG writer looks the family up by name and
 * silently falls back to Times when it misses.
 */
async function embedFonts(pdf: jsPDF, theme: Theme): Promise<void> {
  await Promise.all(
    facesFor(theme).map(async (face) => {
      const response = await fetch(face.url)
      if (!response.ok) throw new Error(`Could not load font ${face.url}`)
      const fileName = face.url.split('/').pop() as string
      pdf.addFileToVFS(fileName, toBase64(await response.arrayBuffer()))
      pdf.addFont(fileName, face.family, face.style)
    }),
  )
}

export interface ExportOptions {
  svg: SVGSVGElement
  page: PageBox
  theme: Theme
  fileName: string
}

export async function exportPosterPdf({
  svg,
  page,
  theme,
  fileName,
}: ExportOptions): Promise<void> {
  const [{ jsPDF: JsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ])

  await waitForFonts(theme)

  /*
   * A PDF page is capped at 14400 points a side. /UserUnit multiplies the
   * page's coordinate space, so an oversized poster is written at
   * `size / userUnit` and stretched back by the viewer. Drawing is scaled to
   * match, which keeps the sheet's true physical dimensions intact.
   */
  const userUnit = userUnitFor(page)
  const boxW = page.w / userUnit
  const boxH = page.h / userUnit

  const pdf = new JsPDF({
    unit: 'mm',
    format: [boxW, boxH],
    orientation: boxW > boxH ? 'landscape' : 'portrait',
    compress: true,
    ...(userUnit > 1 ? { userUnit } : {}),
  })

  await embedFonts(pdf, theme)

  // Work on a detached copy whose intrinsic size equals its viewBox, so the
  // writer maps user units straight onto the page.
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(page.w))
  clone.setAttribute('height', String(page.h))

  // Parked off-screen rather than detached: the writer resolves styles and
  // measures against a live document.
  const stage = document.createElement('div')
  stage.setAttribute(
    'style',
    'position:absolute;left:-10000px;top:0;width:0;height:0;overflow:hidden',
  )
  stage.appendChild(clone)
  document.body.appendChild(stage)

  try {
    await svg2pdf(clone, pdf, { x: 0, y: 0, width: boxW, height: boxH })
    pdf.save(fileName)
  } finally {
    stage.remove()
  }
}
