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
import type { Tile, TilePlan } from './tile'

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

/** Guides drawn on each tile: where to cut, and which sheet this is. */
function drawTileFurniture(pdf: jsPDF, plan: TilePlan, tile: Tile): void {
  const { margin, overlap, usable, sheet } = plan

  pdf.saveGraphicsState()
  pdf.setLineWidth(0.1)
  pdf.setDrawColor(160)

  // Where this tile's own area ends and its neighbour's copy begins: cut here,
  // then lay the next sheet's overlap on top.
  const trimX = margin + usable.w - overlap
  const trimY = margin + usable.h - overlap
  if (tile.col < plan.cols - 1) pdf.line(trimX, margin, trimX, margin + usable.h)
  if (tile.row < plan.rows - 1) pdf.line(margin, trimY, margin + usable.w, trimY)

  // Corner ticks on the printable box, so the sheets can be squared up.
  const tick = 4
  pdf.setDrawColor(110)
  const corners: [number, number, number, number][] = [
    [margin, margin, 1, 1],
    [margin + usable.w, margin, -1, 1],
    [margin, margin + usable.h, 1, -1],
    [margin + usable.w, margin + usable.h, -1, -1],
  ]
  for (const [x, y, sx, sy] of corners) {
    pdf.line(x, y, x + sx * tick, y)
    pdf.line(x, y, x, y + sy * tick)
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(120)
  pdf.text(
    `${tile.label}  ·  col ${tile.col + 1}/${plan.cols}  ·  row ${tile.row + 1}/${plan.rows}` +
      `  ·  overlap ${overlap}mm`,
    margin,
    sheet.h - margin / 2,
  )
  pdf.restoreGraphicsState()
}

export interface TiledExportOptions extends ExportOptions {
  plan: TilePlan
}

/**
 * Write the poster across ordinary sheets.
 *
 * Each page carries the whole drawing behind a viewBox window; the PDF page
 * box clips it, so a tile shows only its own slice. Every page is a normal
 * sheet, which also sidesteps the /UserUnit ceiling a single-page export hits.
 */
export async function exportPosterTiledPdf({
  svg,
  theme,
  fileName,
  plan,
}: TiledExportOptions): Promise<void> {
  const [{ jsPDF: JsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ])

  await waitForFonts(theme)

  const format: [number, number] = [plan.sheet.w, plan.sheet.h]
  const pdf = new JsPDF({ unit: 'mm', format, orientation: plan.orientation, compress: true })
  await embedFonts(pdf, theme)

  const stage = document.createElement('div')
  stage.setAttribute(
    'style',
    'position:absolute;left:-10000px;top:0;width:0;height:0;overflow:hidden',
  )
  document.body.appendChild(stage)

  try {
    for (const [index, tile] of plan.tiles.entries()) {
      if (index > 0) pdf.addPage(format, plan.orientation)

      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('viewBox', `${tile.x} ${tile.y} ${plan.usable.w} ${plan.usable.h}`)
      clone.setAttribute('width', String(plan.usable.w))
      clone.setAttribute('height', String(plan.usable.h))
      stage.replaceChildren(clone)

      await svg2pdf(clone, pdf, {
        x: plan.margin,
        y: plan.margin,
        width: plan.usable.w,
        height: plan.usable.h,
      })
      drawTileFurniture(pdf, plan, tile)
    }
    pdf.save(fileName)
  } finally {
    stage.remove()
  }
}
