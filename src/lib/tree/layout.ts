/**
 * Poster layout.
 *
 * The page is derived from the content, not the other way round. Cards are
 * sized so that no surname is ever abbreviated, the grid is built from those
 * cards, and the sheet is whatever the grid adds up to — cropped to what is
 * actually drawn. Printing at the resulting sizes is a specialist job by
 * design.
 *
 * Everything is in millimetres, and every typographic decision is resolved
 * here so the SVG component only maps a result onto elements.
 */
import { formatDate, formatYear, type DateFormat } from '@/lib/dates'
import type { PageBox } from '@/lib/paper'
import { MAX_PAGE_MM } from '@/lib/paper'
import type { Theme } from '@/lib/themes/types'
import {
  firstGivenName,
  measureText,
  shortenGivenName,
  shortenPlace,
  type TextStyle,
} from '@/lib/text'
import type { Ancestry, AncestorSlot } from './ancestry'

/** `up` puts the root at the bottom; `right` puts it at the left edge. */
export type TreeDirection = 'up' | 'right'
export type DirectionSetting = TreeDirection | 'auto'
/** Name size in millimetres. Everything else on the card derives from it. */
export type NameSize = number

/** Below this, print stops being readable at arm's length. */
export const MIN_NAME_SIZE = 1.6
export const MAX_NAME_SIZE = 6
export type TitleAlign = 'left' | 'right'
/** Generation from which card text is set on its side, or 'off'. */
export type VerticalFrom = number | 'off'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * How tightly the chart packs, as a function of type size.
 *
 * Small type is not merely smaller — it also pulls padding, margins and gaps
 * in, which is the difference between a dense chart and a small one adrift in
 * white space. Interpolated rather than keyed off presets so the size control
 * can be continuous: the card size is the thing being aimed at, and it needs
 * to be reachable, not approximated by three steps.
 */
function densityFor(nameSize: NameSize) {
  const t = clamp((nameSize - 3.1) / (4.9 - 3.1), 0, 1)
  return {
    pad: lerp(0.5, 1.15, t),
    margin: lerp(0.56, 1.15, t),
    gap: lerp(0.18, 0.38, t),
    run: lerp(0.4, 0.62, t),
  }
}

export interface TextLine {
  text: string
  size: number
  weight: 400 | 700
  font: 'display' | 'body'
  fill: string
  /** Baseline offset from the anchor point, in mm. */
  dy: number
  /** Horizontal offset from the anchor point to the text origin, in mm. */
  dx: number
  anchor: 'middle' | 'start'
  /**
   * Exact advance width in mm, set only on letterspaced lines.
   *
   * The PDF writer ignores `letter-spacing` but honours `textLength`, and so
   * does the browser — pinning the width is the only way to track type
   * identically in both. Such lines anchor at `start` because the two
   * renderers disagree about how to centre a run whose drawn width differs
   * from its natural width.
   */
  textLength?: number
}

export interface NodeBox {
  slot: AncestorSlot
  cx: number
  cy: number
  /** Bounding box on the page; transposed when the card is turned. */
  w: number
  h: number
  isRoot: boolean
  isEmpty: boolean
  /** Text is set on its side, a quarter turn anticlockwise. */
  rotated: boolean
  lines: TextLine[]
}

export interface Connector {
  path: string
  muted: boolean
}

export interface Junction {
  x: number
  y: number
}

/** The little plate where a couple's two lines meet, carrying their marriage. */
export interface MarriagePlaque {
  x: number
  y: number
  w: number
  h: number
  lines: TextLine[]
}

export interface PosterLayout {
  page: PageBox
  /** Card size in mm, reported so the size control can be aimed at it. */
  card: { w: number; h: number }
  /** The drawing ran past even the sanity ceiling; something is wrong upstream. */
  oversize: boolean
  direction: TreeDirection
  margin: number
  nodes: NodeBox[]
  connectors: Connector[]
  junctions: Junction[]
  plaques: MarriagePlaque[]
  title: {
    text: string
    size: number
    /** Which edge the title is set against. */
    align: TitleAlign
    /** Anchor x, i.e. the edge itself. */
    x: number
    baseline: number
  }
  ancestry: Ancestry
}

type DatePartsLike = Parameters<typeof formatYear>[0]

const round = (v: number) => Math.round(v * 1000) / 1000
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Genealogical shorthand: born, died. Both are in the subsetted charset. */
const BORN = '*'
const DIED = '†'

export function posterMargin(theme: Theme, nameSize: NameSize): number {
  const { margin } = densityFor(nameSize)
  return round(clamp(nameSize * theme.page.marginScale * margin, 8, 42))
}

interface Sizing {
  nameSize: number
  dateSize: number
  plaqueSize: number
  cardW: number
  cardH: number
  padX: number
  padY: number
  nameLead: number
  dateLead: number
  /** Which lines every card reserves room for, so the grid stays regular. */
  plan: {
    given: boolean
    dates: boolean
    birth: boolean
    death: boolean
  }
  plaqueW: number
  plaqueH: number
  /**
   * Text width the plate was measured against. Derived by subtracting padding
   * back off the rounded `plaqueW`, the widest place could come out a
   * thousandth of a millimetre too wide for its own plate and get clipped.
   */
  plaqueInnerW: number
}

export interface LayoutInput {
  ancestry: Ancestry
  theme: Theme
  direction: DirectionSetting
  nameSize: NameSize
  showEmpty: boolean
  showPlaces: boolean
  showMarriages: boolean
  title: string
  titleAlign: TitleAlign
  verticalFrom: VerticalFrom
  dateFormat: DateFormat
}

/**
 * Work out how big a card has to be for this particular set of people. The
 * surname drives the width: it is never shortened, so the card grows instead.
 */
function measureCards(input: LayoutInput): Sizing {
  const { ancestry, theme, nameSize, showPlaces, showMarriages, dateFormat } = input
  const dateSize = round(nameSize * 0.72)
  const plaqueSize = round(nameSize * 0.62)

  const display = theme.fonts.display.widthScale
  const body = theme.fonts.body.widthScale
  const surnameStyle: TextStyle = {
    size: nameSize,
    widthScale: display,
    tracking: theme.node.surnameTracking,
  }
  const givenStyle: TextStyle = { size: nameSize, widthScale: display }
  const metaStyle: TextStyle = { size: dateSize, widthScale: body }

  const people = ancestry.slots.map((s) => s.person).filter((p) => p != null)

  let nameWidth = 0
  let metaWidth = 0
  let placeWidth = 0
  const plan = { given: false, dates: false, birth: false, death: false }

  for (const person of people) {
    const surname =
      theme.node.surnameCase === 'upper' ? person.surname.toUpperCase() : person.surname
    nameWidth = Math.max(nameWidth, measureText(surname, surnameStyle))

    const given = firstGivenName(person.given)
    if (given) {
      plan.given = true
      nameWidth = Math.max(nameWidth, measureText(given, givenStyle))
    }

    const birthYear = person.birth?.year
    const deathYear = person.death?.year
    if (birthYear != null || deathYear != null) plan.dates = true

    if (showPlaces) {
      const birthPlace = person.birth?.place
      const deathPlace = person.death?.place
      if (birthYear != null || birthPlace) plan.birth = true
      if (deathYear != null || deathPlace) plan.death = true
      // Budget against the locality alone; the rest can fall away.
      for (const place of [birthPlace, deathPlace]) {
        if (!place) continue
        const locality = place.split(',')[0].trim()
        const sample = formatYear({ year: 1888, qualifier: 'about' }, dateFormat)
        placeWidth = Math.max(
          placeWidth,
          measureText(`${BORN} ${sample} · ${locality}`, metaStyle),
        )
      }
    } else if (birthYear != null && deathYear != null) {
      const span = `${formatYear(person.birth?.date ?? null, dateFormat)}–${formatYear(person.death?.date ?? null, dateFormat)}`
      metaWidth = Math.max(metaWidth, measureText(span, metaStyle))
    }
  }

  // Places influence the width but must not be allowed to dominate it.
  const contentW = Math.max(nameWidth, metaWidth, Math.min(placeWidth, nameWidth * 1.8), 18)
  const density = densityFor(nameSize)
  const padX = round(nameSize * 0.85 * density.pad)
  const padY = round(nameSize * 0.5 * density.pad)
  const cardW = round(contentW + padX * 2)

  const nameLead = round(nameSize * 1.16)
  const dateLead = round(dateSize * 1.5)
  const lineHeights =
    (plan.given ? nameLead : 0) +
    nameLead +
    (showPlaces
      ? (plan.birth ? dateLead : 0) + (plan.death ? dateLead : 0)
      : plan.dates
        ? dateLead
        : 0)
  const cardH = round(lineHeights + padY * 2)

  // Marriage plates carry a date line and a place line.
  let plaqueW = 0
  if (showMarriages) {
    const plaqueStyle: TextStyle = { size: plaqueSize, widthScale: body }
    for (const person of people) {
      const marriage = person.parentsMarriage
      if (!marriage) continue
      plaqueW = Math.max(
        plaqueW,
        measureText(formatDate(marriage.date, dateFormat), plaqueStyle),
      )
      if (marriage.place) {
        plaqueW = Math.max(
          plaqueW,
          measureText(marriage.place.split(',')[0].trim(), plaqueStyle),
        )
      }
    }
  }
  const plaqueH = plaqueW > 0 ? round(plaqueSize * 3.4) : 0
  const plaqueInnerW = plaqueW
  if (plaqueW > 0) plaqueW = round(plaqueW + plaqueSize * 2)

  return {
    nameSize, dateSize, plaqueSize, cardW, cardH, padX, padY,
    nameLead, dateLead, plan, plaqueW, plaqueH, plaqueInnerW,
  }
}

/** Build the text for one card against the width the grid has settled on. */
function buildLines(
  slot: AncestorSlot,
  sizing: Sizing,
  theme: Theme,
  isRoot: boolean,
  showPlaces: boolean,
  dateFormat: DateFormat,
): TextLine[] {
  const { palette, node } = theme
  const { nameSize, dateSize, nameLead, dateLead, plan } = sizing
  const availW = sizing.cardW - sizing.padX * 2
  const person = slot.person

  const ink = isRoot ? palette.rootInk : palette.nodeInk
  const muted = isRoot ? palette.rootInk : palette.inkMuted

  const display = theme.fonts.display.widthScale
  const body = theme.fonts.body.widthScale

  if (!person) {
    return [
      {
        text: '·  ·  ·',
        size: round(nameSize * 0.9),
        weight: 400,
        font: 'body',
        fill: palette.emptyInk,
        dy: round(nameSize * 0.32),
        dx: 0,
        anchor: 'middle',
      },
    ]
  }

  const lines: TextLine[] = []
  const leads: number[] = []

  const push = (
    text: string,
    size: number,
    weight: 400 | 700,
    font: 'display' | 'body',
    fill: string,
    tracking: number,
    lead: number,
  ) => {
    if (!text) return
    const widthScale = font === 'body' ? body : display
    if (tracking > 0) {
      const textLength = round(measureText(text, { size, widthScale, tracking }))
      lines.push({
        text, size, weight, font, fill, dy: 0,
        dx: round(-textLength / 2), anchor: 'start', textLength,
      })
    } else {
      lines.push({ text, size, weight, font, fill, dy: 0, dx: 0, anchor: 'middle' })
    }
    leads.push(lead)
  }

  if (plan.given) {
    push(
      shortenGivenName(person.given, availW, { size: nameSize, widthScale: display }),
      nameSize, 400, 'display', ink, 0, nameLead,
    )
  }

  const surname =
    node.surnameCase === 'upper' ? person.surname.toUpperCase() : person.surname
  push(surname, nameSize, 700, 'display', ink, node.surnameTracking, nameLead)

  const metaStyle: TextStyle = { size: dateSize, widthScale: body }
  const eventLine = (mark: string, event: { date: DatePartsLike } | null | undefined, place: string | null): string => {
    const parts: string[] = []
    const when = formatYear(event?.date ?? null, dateFormat)
    if (when) parts.push(when)
    if (place) {
      // Whatever room is left after the marker and year goes to the place.
      const used = measureText(`${mark} ${parts.join('')} · `, metaStyle)
      const trimmed = shortenPlace(place, Math.max(0, availW - used), metaStyle)
      if (trimmed) parts.push(trimmed)
    }
    return parts.length ? `${mark} ${parts.join(' · ')}` : ''
  }

  if (showPlaces) {
    if (plan.birth) {
      push(
        eventLine(BORN, person.birth, person.birth?.place ?? null),
        dateSize, 400, 'body', muted, 0, dateLead,
      )
    }
    if (plan.death) {
      push(
        eventLine(DIED, person.death, person.death?.place ?? null),
        dateSize, 400, 'body', muted, 0, dateLead,
      )
    }
  } else if (plan.dates) {
    const birth = formatYear(person.birth?.date ?? null, dateFormat)
    const death = formatYear(person.death?.date ?? null, dateFormat)
    let dates = ''
    if (birth && death) dates = `${birth}–${death}`
    else if (birth) dates = `${BORN} ${birth}`
    else if (death) dates = `${DIED} ${death}`
    push(dates, dateSize, 400, 'body', muted, 0, dateLead)
  }

  // Centre the stack on the card.
  const stackH = leads.reduce((sum, l) => sum + l, 0)
  let cursor = -stackH / 2
  lines.forEach((line, i) => {
    cursor += leads[i]
    line.dy = round(cursor - leads[i] * 0.28)
  })

  return lines
}

function elbowPath(
  s: { x: number; y: number }, e: { x: number; y: number }, mid: number, axis: 'x' | 'y',
): string {
  return axis === 'x'
    ? `M ${round(s.x)} ${round(s.y)} L ${round(mid)} ${round(s.y)} L ${round(mid)} ${round(e.y)} L ${round(e.x)} ${round(e.y)}`
    : `M ${round(s.x)} ${round(s.y)} L ${round(s.x)} ${round(mid)} L ${round(e.x)} ${round(mid)} L ${round(e.x)} ${round(e.y)}`
}

function curvePath(
  s: { x: number; y: number }, e: { x: number; y: number }, mid: number, axis: 'x' | 'y',
): string {
  return axis === 'x'
    ? `M ${round(s.x)} ${round(s.y)} C ${round(mid)} ${round(s.y)} ${round(mid)} ${round(e.y)} ${round(e.x)} ${round(e.y)}`
    : `M ${round(s.x)} ${round(s.y)} C ${round(s.x)} ${round(mid)} ${round(e.x)} ${round(mid)} ${round(e.x)} ${round(e.y)}`
}

function bracketPath(
  s: { x: number; y: number }, e: { x: number; y: number },
  mid: number, axis: 'x' | 'y', radius: number,
): string {
  if (axis === 'x') {
    const vy = Math.sign(e.y - s.y)
    const r = Math.min(radius, Math.abs(e.y - s.y) / 2, Math.abs(mid - s.x), Math.abs(e.x - mid))
    if (r < 0.05 || vy === 0) return elbowPath(s, e, mid, axis)
    const h1 = Math.sign(mid - s.x) || 1
    const h2 = Math.sign(e.x - mid) || 1
    return [
      `M ${round(s.x)} ${round(s.y)}`,
      `L ${round(mid - h1 * r)} ${round(s.y)}`,
      `Q ${round(mid)} ${round(s.y)} ${round(mid)} ${round(s.y + vy * r)}`,
      `L ${round(mid)} ${round(e.y - vy * r)}`,
      `Q ${round(mid)} ${round(e.y)} ${round(mid + h2 * r)} ${round(e.y)}`,
      `L ${round(e.x)} ${round(e.y)}`,
    ].join(' ')
  }

  const vx = Math.sign(e.x - s.x)
  const r = Math.min(radius, Math.abs(e.x - s.x) / 2, Math.abs(mid - s.y), Math.abs(e.y - mid))
  if (r < 0.05 || vx === 0) return elbowPath(s, e, mid, axis)
  const v1 = Math.sign(mid - s.y) || 1
  const v2 = Math.sign(e.y - mid) || 1
  return [
    `M ${round(s.x)} ${round(s.y)}`,
    `L ${round(s.x)} ${round(mid - v1 * r)}`,
    `Q ${round(s.x)} ${round(mid)} ${round(s.x + vx * r)} ${round(mid)}`,
    `L ${round(e.x - vx * r)} ${round(mid)}`,
    `Q ${round(e.x)} ${round(mid)} ${round(e.x)} ${round(mid + v2 * r)}`,
    `L ${round(e.x)} ${round(e.y)}`,
  ].join(' ')
}

function connectorPath(
  theme: Theme, s: { x: number; y: number }, e: { x: number; y: number },
  mid: number, axis: 'x' | 'y',
): string {
  switch (theme.connector.style) {
    case 'curve':
      return curvePath(s, e, mid, axis)
    case 'bracket':
      return bracketPath(s, e, mid, axis, theme.connector.cornerRadius)
    default:
      return elbowPath(s, e, mid, axis)
  }
}

interface Grid {
  /** Extent along the sibling axis for a card at this generation. */
  siblingExtent: (generation: number) => number
  /** Extent along the generation axis for a card at this generation. */
  genExtent: (generation: number) => number
  /** Clearance between adjacent cards at this generation. */
  gap: (generation: number) => number
  /** Clearance between generations, where the connectors turn. */
  run: number
}

/**
 * Card extents per generation. A turned card is simply its bounding box
 * transposed, which is what makes vertical text worth having: in an upward
 * chart it cuts each leaf's footprint from the card's width to its height.
 */
function makeGrid(
  sizing: Sizing,
  direction: TreeDirection,
  showMarriages: boolean,
  nameSize: NameSize,
  isVertical: (generation: number) => boolean,
  depth: number,
): Grid {
  const density = densityFor(nameSize)
  const boxW = (g: number) => (isVertical(g) ? sizing.cardH : sizing.cardW)
  const boxH = (g: number) => (isVertical(g) ? sizing.cardW : sizing.cardH)

  const siblingExtent = direction === 'right' ? boxH : boxW
  const genExtent = direction === 'right' ? boxW : boxH
  const gap = (g: number) => Math.max(sizing.nameSize * 1.1, siblingExtent(g) * density.gap)

  const widestGen = Math.max(...Array.from({ length: depth }, (_, g) => genExtent(g)))
  const plaqueNeed = showMarriages
    ? direction === 'right'
      ? sizing.plaqueW + sizing.nameSize * 3
      : sizing.plaqueH + sizing.nameSize * 3
    : 0
  const run = Math.max(widestGen * density.run, plaqueNeed, sizing.nameSize * 5)

  return { siblingExtent, genExtent, gap, run }
}

export function layoutPoster(input: LayoutInput): PosterLayout {
  const {
    ancestry, theme, nameSize, showEmpty, showPlaces, showMarriages,
    title, titleAlign, verticalFrom, dateFormat,
  } = input

  const sizing = measureCards(input)
  const margin = posterMargin(theme, nameSize)

  const slotByNumber = new Map(ancestry.slots.map((slot) => [slot.ahnentafel, slot]))
  /** A slot is drawn if it holds someone, or if placeholders are switched on. */
  const isVisible = (n: number): boolean => {
    const slot = slotByNumber.get(n)
    return slot != null && (showEmpty || slot.person != null)
  }
  const parentsOf = (n: number) => [n * 2, n * 2 + 1].filter(isVisible)

  // Shape depends on the drawn tree, not the full one: once unknown ancestors
  // are omitted the pedigree is genuinely narrower, and the sheet should say so.
  const countLeaves = (n: number): number => {
    const parents = parentsOf(n)
    if (!parents.length) return 1
    return parents.reduce((sum, parent) => sum + countLeaves(parent), 0)
  }
  const deepest = (n: number): number => {
    const parents = parentsOf(n)
    if (!parents.length) return slotByNumber.get(n)?.generation ?? 0
    return Math.max(...parents.map(deepest))
  }
  const rooted = isVisible(1)
  const leafCount = rooted ? countLeaves(1) : 1
  const maxGeneration = rooted ? deepest(1) : 0

  const isVertical = (generation: number) =>
    verticalFrom !== 'off' && generation >= verticalFrom
  const depth = maxGeneration + 1

  const shapeFor = (candidate: TreeDirection) => {
    const g = makeGrid(sizing, candidate, showMarriages, nameSize, isVertical, depth)
    const sibling = leafCount * (g.siblingExtent(maxGeneration) + g.gap(maxGeneration))
    let span = -g.run
    for (let gen = 0; gen < depth; gen++) span += g.genExtent(gen) + g.run
    return candidate === 'right' ? { w: span, h: sibling } : { w: sibling, h: span }
  }
  const direction: TreeDirection =
    input.direction !== 'auto'
      ? input.direction
      : (() => {
          const ratio = (b: PageBox) => Math.max(b.w, b.h) / Math.min(b.w, b.h)
          return ratio(shapeFor('right')) <= ratio(shapeFor('up')) ? 'right' : 'up'
        })()

  const grid = makeGrid(sizing, direction, showMarriages, nameSize, isVertical, depth)

  // Where each generation sits along its axis; extents can differ per row now.
  const genCentre: number[] = []
  let acc = 0
  for (let g = 0; g < depth; g++) {
    genCentre[g] = acc + grid.genExtent(g) / 2
    acc += grid.genExtent(g) + grid.run
  }
  const genSpan = acc - grid.run

  /**
   * Place the drawn tree along the sibling axis.
   *
   * Leaves take their own slot in turn, and every other node is centred between
   * its outermost parents. With placeholders on, every branch reaches full
   * depth and this reproduces an even grid; with them off the gaps close up.
   */
  const along = new Map<number, number>()
  let cursor = 0

  const shiftBranch = (n: number, delta: number) => {
    const pos = along.get(n)
    if (pos == null) return
    along.set(n, pos + delta)
    for (const parent of parentsOf(n)) shiftBranch(parent, delta)
  }

  const place = (n: number): number => {
    const generation = slotByNumber.get(n)?.generation ?? 0
    const own = grid.siblingExtent(generation) + grid.gap(generation)
    const parents = parentsOf(n)

    if (!parents.length) {
      const pos = cursor + own / 2
      cursor += own
      along.set(n, pos)
      return pos
    }

    const start = cursor
    const spread = parents.map(place)
    let pos = (Math.min(...spread) + Math.max(...spread)) / 2

    // A card wider than the band its ancestors used has to push them apart, or
    // generations with bigger cards would collide where the tree runs thin.
    const span = cursor - start
    if (span < own) {
      const extra = own - span
      for (const parent of parents) shiftBranch(parent, extra / 2)
      pos += extra / 2
      cursor += extra
    }

    along.set(n, pos)
    return pos
  }
  if (rooted) place(1)

  const nodes: NodeBox[] = ancestry.slots
    .filter((slot) => along.has(slot.ahnentafel))
    .map((slot) => {
      const lane = along.get(slot.ahnentafel) as number
      const across = genCentre[slot.generation]
      const isRoot = slot.generation === 0
      const rotated = isVertical(slot.generation)
      return {
        slot,
        cx: round(direction === 'right' ? across : lane),
        // Upward charts grow from the bottom, so the root sits at the far edge.
        cy: round(direction === 'right' ? lane : genSpan - across),
        w: round(rotated ? sizing.cardH : sizing.cardW),
        h: round(rotated ? sizing.cardW : sizing.cardH),
        isRoot,
        isEmpty: !slot.person,
        rotated,
        lines: buildLines(slot, sizing, theme, isRoot, showPlaces, dateFormat),
      }
    })

  const byNumber = new Map(nodes.map((n) => [n.slot.ahnentafel, n]))
  const visible = (n: NodeBox | undefined): n is NodeBox => n != null

  const connectors: Connector[] = []
  const junctions: Junction[] = []
  const plaques: MarriagePlaque[] = []
  const axis: 'x' | 'y' = direction === 'right' ? 'x' : 'y'

  for (const child of nodes) {
    const father = byNumber.get(child.slot.ahnentafel * 2)
    const mother = byNumber.get(child.slot.ahnentafel * 2 + 1)
    const parents = [father, mother].filter(visible)
    if (!parents.length) continue

    const start =
      direction === 'right'
        ? { x: child.cx + child.w / 2, y: child.cy }
        : { x: child.cx, y: child.cy - child.h / 2 }
    const parentEdge =
      direction === 'right'
        ? Math.min(...parents.map((p) => p.cx - p.w / 2))
        : Math.max(...parents.map((p) => p.cy + p.h / 2))
    const mid = direction === 'right' ? (start.x + parentEdge) / 2 : (start.y + parentEdge) / 2

    for (const parent of parents) {
      const end =
        direction === 'right'
          ? { x: parent.cx - parent.w / 2, y: parent.cy }
          : { x: parent.cx, y: parent.cy + parent.h / 2 }
      connectors.push({
        path: connectorPath(theme, start, end, mid, axis),
        muted: parent.isEmpty,
      })
    }

    const joint =
      direction === 'right'
        ? { x: round(mid), y: round(start.y) }
        : { x: round(start.x), y: round(mid) }

    // The marriage plate replaces the junction dot where there is one to show.
    const marriage = showMarriages ? child.slot.person?.parentsMarriage : null
    if (marriage && parents.length === 2 && sizing.plaqueW > 0) {
      const plaqueStyle: TextStyle = {
        size: sizing.plaqueSize,
        widthScale: theme.fonts.body.widthScale,
      }
      const innerW = sizing.plaqueInnerW
      const texts = [
        formatDate(marriage.date, dateFormat),
        marriage.place ? shortenPlace(marriage.place, innerW, plaqueStyle) : '',
      ].filter(Boolean)

      const lead = sizing.plaqueSize * 1.35
      const stackH = texts.length * lead
      plaques.push({
        x: joint.x,
        y: joint.y,
        w: sizing.plaqueW,
        h: round(stackH + sizing.plaqueSize * 1.1),
        lines: texts.map((text, i) => ({
          text,
          size: sizing.plaqueSize,
          weight: (i === 0 ? 700 : 400) as 400 | 700,
          font: 'body' as const,
          fill: theme.palette.plaqueInk,
          dy: round(-stackH / 2 + lead * (i + 1) - lead * 0.3),
          dx: 0,
          anchor: 'middle' as const,
        })),
      })
    } else if (theme.connector.junctionRadius > 0) {
      junctions.push(joint)
    }
  }

  // Crop the sheet to what is actually drawn — hiding unknown ancestors then
  // genuinely saves paper instead of leaving the grid's empty rows behind.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const extend = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x - w / 2)
    maxX = Math.max(maxX, x + w / 2)
    minY = Math.min(minY, y - h / 2)
    maxY = Math.max(maxY, y + h / 2)
  }
  for (const n of nodes) extend(n.cx, n.cy, n.w, n.h)
  for (const p of plaques) extend(p.x, p.y, p.w, p.h)
  if (!nodes.length) {
    minX = 0
    minY = 0
    maxX = sizing.cardW
    maxY = sizing.cardH
  }

  const titleSize = round(clamp(sizing.nameSize * 2.6, 6, 18))
  // A gap off the tree, the title, then room for its descenders.
  const titleBand = round(titleSize * 2.0)

  const contentW = maxX - minX
  const contentH = maxY - minY

  // The title must not overrun the sheet the tree asked for.
  const titleW = measureText(title, {
    size: titleSize,
    widthScale: theme.fonts.display.widthScale,
  })
  const wantedW = Math.max(contentW, titleW) + margin * 2
  const wantedH = contentH + margin * 2 + titleBand
  // Never clipped to suit an output format: a clamp here would leave the tree
  // running off both edges of its own page. Only a runaway is capped.
  const pageW = round(clamp(wantedW, 60, MAX_PAGE_MM))
  const pageH = round(clamp(wantedH, 60, MAX_PAGE_MM))
  const oversize = wantedW > MAX_PAGE_MM || wantedH > MAX_PAGE_MM

  // Shift the grid into place: centred horizontally, below the title block.
  const offsetX = (pageW - contentW) / 2 - minX
  const offsetY = margin - minY

  for (const n of nodes) {
    n.cx = round(n.cx + offsetX)
    n.cy = round(n.cy + offsetY)
  }
  for (const p of plaques) {
    p.x = round(p.x + offsetX)
    p.y = round(p.y + offsetY)
  }
  for (const j of junctions) {
    j.x = round(j.x + offsetX)
    j.y = round(j.y + offsetY)
  }
  const shift = (path: string) =>
    path.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
      `${round(Number(x) + offsetX)} ${round(Number(y) + offsetY)}`,
    )
  for (const c of connectors) c.path = shift(c.path)

  return {
    page: { w: pageW, h: pageH },
    card: { w: sizing.cardW, h: sizing.cardH },
    oversize,
    direction,
    margin,
    ancestry,
    nodes,
    connectors,
    junctions,
    plaques,
    title: {
      text: title,
      size: titleSize,
      align: titleAlign,
      x: titleAlign === 'left' ? margin : round(pageW - margin),
      baseline: round(margin + contentH + titleSize * 1.6),
    },
  }
}
