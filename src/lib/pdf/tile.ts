/**
 * Tiled printing.
 *
 * Splits the poster across ordinary sheets so it can be printed on a desk
 * printer and assembled. Done here rather than by shelling out to pdfposter or
 * mutool, because those are command-line tools: wrapping one would mean a
 * server, and uploading the genealogy to it. It also means the grid, the sheet
 * orientation and the overlap can be chosen from the poster's real dimensions
 * instead of being typed in by hand.
 *
 * Every page is an ordinary small sheet, so tiled output sidesteps the
 * /UserUnit ceiling that limits a single-page PDF.
 */
import type { PageBox } from '@/lib/paper'

export type SheetName = 'A4' | 'A3'

const SHEETS: Record<SheetName, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
}

/** Edge no consumer printer can reach. */
export const DEFAULT_MARGIN = 8
/** Glue flap: adjacent tiles repeat this much of each other. */
export const DEFAULT_OVERLAP = 10

export interface Tile {
  col: number
  row: number
  /** Window origin in poster coordinates, mm. */
  x: number
  y: number
  label: string
}

export interface TilePlan {
  sheet: PageBox
  sheetName: SheetName
  orientation: 'portrait' | 'landscape'
  cols: number
  rows: number
  /** Printable window on each sheet, mm. */
  usable: { w: number; h: number }
  margin: number
  overlap: number
  tiles: Tile[]
  get count(): number
}

function planFor(
  poster: PageBox,
  sheetName: SheetName,
  orientation: 'portrait' | 'landscape',
  margin: number,
  overlap: number,
): TilePlan {
  const [short, long] = SHEETS[sheetName]
  const sheet: PageBox =
    orientation === 'portrait' ? { w: short, h: long } : { w: long, h: short }

  const usable = { w: sheet.w - margin * 2, h: sheet.h - margin * 2 }
  // Each tile advances by `step` and repeats `overlap` of its neighbour, so n
  // tiles reach n*step + overlap.
  const stepX = Math.max(1, usable.w - overlap)
  const stepY = Math.max(1, usable.h - overlap)
  const cols = Math.max(1, Math.ceil((poster.w - overlap) / stepX))
  const rows = Math.max(1, Math.ceil((poster.h - overlap) / stepY))

  const tiles: Tile[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        col,
        row,
        x: col * stepX,
        y: row * stepY,
        label: `R${row + 1}C${col + 1}`,
      })
    }
  }

  return {
    sheet,
    sheetName,
    orientation,
    cols,
    rows,
    usable,
    margin,
    overlap,
    tiles,
    get count() {
      return this.cols * this.rows
    },
  }
}

export interface TileSettings {
  sheet: SheetName
  orientation: 'portrait' | 'landscape' | 'auto'
  margin?: number
  overlap?: number
}

/**
 * Work out the grid. `auto` picks whichever sheet orientation needs fewer
 * pages — which is not always the poster's own orientation, and is the part
 * external tools leave to you.
 */
export function planTiles(poster: PageBox, settings: TileSettings): TilePlan {
  const margin = settings.margin ?? DEFAULT_MARGIN
  const overlap = settings.overlap ?? DEFAULT_OVERLAP

  if (settings.orientation !== 'auto') {
    return planFor(poster, settings.sheet, settings.orientation, margin, overlap)
  }

  const portrait = planFor(poster, settings.sheet, 'portrait', margin, overlap)
  const landscape = planFor(poster, settings.sheet, 'landscape', margin, overlap)
  if (portrait.count !== landscape.count) {
    return portrait.count < landscape.count ? portrait : landscape
  }
  // Same page count: follow the poster's own proportions.
  return poster.w >= poster.h ? landscape : portrait
}
