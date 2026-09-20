/**
 * Blueprint — a drafting-table reading of the pedigree: cyanotype ground, a
 * two-level survey grid, cards with corner ticks and Ahnentafel numbers set in
 * mono, the way a drawing carries its part numbers.
 */
import { IBM_PLEX_MONO, IBM_PLEX_SANS } from './fonts'
import type { Theme } from './types'

const GROUND = '#0B2436'
const LINE = '#4C93BE'
const ACCENT = '#4EC7F2'

export const blueprint: Theme = {
  id: 'blueprint',
  name: 'Blueprint',

  fonts: { display: IBM_PLEX_SANS, body: IBM_PLEX_MONO },

  palette: {
    paper: GROUND,
    ink: '#DFEDF7',
    inkMuted: '#89B4CE',
    accent: ACCENT,

    nodeFill: '#0F3046',
    nodeStroke: '#3F82AC',
    nodeInk: '#E6F2FA',

    rootFill: ACCENT,
    rootStroke: '#A6E4FA',
    rootInk: '#05202F',

    emptyFill: 'none',
    emptyStroke: '#2B5875',
    emptyInk: '#4F7F9D',

    connector: LINE,
    titleInk: '#EAF5FC',

    plaqueFill: '#0F3046',
    plaqueStroke: '#3F82AC',
    plaqueInk: '#9CC6DE',
  },

  page: { marginScale: 5.4, hairline: 0.16 },

  node: {
    radius: 0,
    strokeWidth: 0.26,
    emptyDash: '1.4 1.2',
    surnameCase: 'upper',
    surnameTracking: 0.07,
  },

  connector: {
    style: 'elbow',
    strokeWidth: 0.26,
    opacity: 0.82,
    cornerRadius: 0,
    junctionRadius: 0.5,
    mutedOpacity: 0.34,
  },

  background: {
    defs: () => (
      <>
        <linearGradient id="blueprint-ground" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#0D2B41" />
          <stop offset="0.6" stopColor={GROUND} />
          <stop offset="1" stopColor="#081B29" />
        </linearGradient>
        <pattern id="blueprint-fine" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 L 0 5" fill="none" stroke={LINE} strokeWidth="0.07" opacity="0.3" />
        </pattern>
        <pattern id="blueprint-coarse" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 L 0 25" fill="none" stroke={LINE} strokeWidth="0.16" opacity="0.42" />
        </pattern>
        <radialGradient id="blueprint-glow" cx="0.5" cy="0.55" r="0.62">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.14" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </>
    ),

    layer: (theme, page, margin) => {
      const inset = margin * 0.45
      const tick = 4.5
      const corners: [number, number, number, number][] = [
        [inset, inset, 1, 1],
        [page.w - inset, inset, -1, 1],
        [inset, page.h - inset, 1, -1],
        [page.w - inset, page.h - inset, -1, -1],
      ]

      return (
        <>
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#blueprint-ground)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#blueprint-fine)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#blueprint-coarse)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#blueprint-glow)" />

          <rect
            x={inset}
            y={inset}
            width={page.w - inset * 2}
            height={page.h - inset * 2}
            fill="none"
            stroke={LINE}
            strokeWidth="0.3"
            opacity="0.6"
          />

          {/* Registration ticks at the sheet corners. */}
          {corners.map(([x, y, sx, sy], i) => (
            <path
              key={i}
              d={`M ${x + sx * tick} ${y} L ${x} ${y} L ${x} ${y + sy * tick}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth="0.45"
              opacity="0.9"
            />
          ))}
        </>
      )
    },
  },

  nodeDecoration: (box, theme) => {
    if (box.isEmpty) return null
    const tick = Math.min(2.1, box.w * 0.16, box.h * 0.3)
    if (tick < 0.7) return null

    const left = box.cx - box.w / 2
    const right = box.cx + box.w / 2
    const top = box.cy - box.h / 2
    const bottom = box.cy + box.h / 2
    const stroke = box.isRoot ? theme.palette.rootInk : theme.palette.accent
    const corners: [number, number, number, number][] = [
      [left, top, 1, 1],
      [right, top, -1, 1],
      [left, bottom, 1, -1],
      [right, bottom, -1, -1],
    ]

    return (
      <>
        {corners.map(([x, y, sx, sy], i) => (
          <path
            key={i}
            d={`M ${x + sx * tick} ${y} L ${x} ${y} L ${x} ${y + sy * tick}`}
            fill="none"
            stroke={stroke}
            strokeWidth="0.22"
            opacity="0.75"
          />
        ))}
        {/* The slot's Ahnentafel number, like a part number on a drawing. */}
        {!box.isRoot && box.w > 22 && (
          <text
            x={left + 1.5}
            y={top + 2.6}
            fontFamily={theme.fonts.body.family}
            fontSize="2.1"
            fontWeight={400}
            fill={theme.palette.accent}
            opacity="0.65"
          >
            {box.slot.ahnentafel}
          </text>
        )}
      </>
    )
  },

}
