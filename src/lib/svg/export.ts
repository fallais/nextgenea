/**
 * Client-side SVG export.
 *
 * The poster is already an SVG sized in real millimetres, so this is the
 * lossless path: no page-size ceiling, no coordinate limits, nothing to
 * rasterise. For a very large chart it is the only export that can represent
 * the sheet at all, since a PDF MediaBox stops at 200 inches a side.
 *
 * The theme's faces are inlined as base64 `@font-face` rules so the file opens
 * correctly on a machine that never installed them, which is the usual
 * situation at a print shop.
 */
import { downloadBlob, facesFor, fetchFaceBase64, waitForFonts } from '@/lib/fonts'
import type { Theme } from '@/lib/themes/types'

const SVG_NS = 'http://www.w3.org/2000/svg'

async function fontFaceCss(theme: Theme): Promise<string> {
  const faces = await Promise.all(
    facesFor(theme).map(async (face) => {
      const base64 = await fetchFaceBase64(face.url)
      return [
        '@font-face {',
        `  font-family: '${face.family}';`,
        '  font-style: normal;',
        `  font-weight: ${face.weight};`,
        `  src: url('data:font/ttf;base64,${base64}') format('truetype');`,
        '}',
      ].join('\n')
    }),
  )
  return faces.join('\n')
}

/** Serialise the live poster into a standalone SVG document. */
export async function buildPosterSvg(svg: SVGSVGElement, theme: Theme): Promise<string> {
  await waitForFonts(theme)

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  // The preview sets `display:block` inline; a standalone file should not.
  clone.removeAttribute('style')

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = `\n${await fontFaceCss(theme)}\n`
  clone.insertBefore(style, clone.firstChild)

  const markup = new XMLSerializer().serializeToString(clone)
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${markup}\n`
}

export interface ExportSvgOptions {
  svg: SVGSVGElement
  theme: Theme
  fileName: string
}

export async function exportPosterSvg({ svg, theme, fileName }: ExportSvgOptions): Promise<void> {
  const xml = await buildPosterSvg(svg, theme)
  downloadBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), fileName)
}
