/**
 * Botanical — a herbarium plate: soft ivory wash, a sparse pressed-leaf motif,
 * rounded cards with hairline sage rules, and lines that curve like stems.
 */
import { CORMORANT, KARLA } from './fonts'
import type { Theme } from './types'

const INK = '#213D2C'
const PAPER = '#F5F2E9'
const SAGE = '#8FA894'
const TERRACOTTA = '#B36A4A'

export const botanical: Theme = {
  id: 'botanical',
  name: 'Botanical',

  fonts: { display: CORMORANT, body: KARLA },

  palette: {
    paper: PAPER,
    ink: INK,
    inkMuted: '#5E7A66',
    accent: TERRACOTTA,

    nodeFill: '#FFFFFF',
    nodeStroke: '#C6D2C5',
    nodeInk: INK,

    rootFill: INK,
    rootStroke: INK,
    rootInk: '#F7F4EB',

    emptyFill: 'none',
    emptyStroke: '#D6DED3',
    emptyInk: '#AAB9A9',

    connector: SAGE,
    titleInk: INK,

    plaqueFill: '#FFFFFF',
    plaqueStroke: '#C6D2C5',
    plaqueInk: '#5E7A66',
  },

  page: { marginScale: 5.4, hairline: 0.16 },

  node: {
    radius: 1.6,
    strokeWidth: 0.22,
    emptyDash: '0.9 1.3',
    surnameCase: 'upper',
    surnameTracking: 0.1,
  },

  connector: {
    style: 'curve',
    strokeWidth: 0.3,
    opacity: 0.7,
    cornerRadius: 0,
    junctionRadius: 0,
    mutedOpacity: 0.36,
  },

  background: {
    defs: () => (
      <>
        <linearGradient id="botanical-wash" x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#FBF9F2" />
          <stop offset="0.5" stopColor={PAPER} />
          <stop offset="1" stopColor="#EDE9DB" />
        </linearGradient>

        {/* A pressed sprig, tiled loosely and set very low in contrast. */}
        <pattern
          id="botanical-sprig"
          width="38"
          height="38"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-16)"
        >
          <path
            d="M 12 4 C 17 10, 17 19, 12 26 C 7 19, 7 10, 12 4 Z"
            fill={INK}
            opacity="0.05"
          />
          <path d="M 12 4 L 12 27" stroke={INK} strokeWidth="0.2" opacity="0.08" />
          <path
            d="M 29 20 C 33 25, 33 31, 29 36 C 25 31, 25 25, 29 20 Z"
            fill={SAGE}
            opacity="0.07"
          />
          <path d="M 29 20 L 29 37" stroke={INK} strokeWidth="0.16" opacity="0.06" />
        </pattern>

        <radialGradient id="botanical-halo" cx="0.5" cy="0.6" r="0.66">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </>
    ),

    layer: (theme, page, margin) => {
      const inset = margin * 0.5
      return (
        <>
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#botanical-wash)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#botanical-sprig)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#botanical-halo)" />

          {/* A single hairline rule, held off the trim like a plate border. */}
          <rect
            x={inset}
            y={inset}
            width={page.w - inset * 2}
            height={page.h - inset * 2}
            fill="none"
            stroke={SAGE}
            strokeWidth="0.22"
            opacity="0.55"
            rx="1.2"
          />
        </>
      )
    },
  },

  // Two small leaves flanking the root, the way a plate signs its specimen.
  nodeDecoration: (box, theme) => {
    if (!box.isRoot) return null
    const y = box.cy + box.h / 2 + 3.4
    const spread = Math.min(box.w * 0.3, 13)
    const leaf = (dir: 1 | -1) =>
      `M ${box.cx + dir * 2.4} ${y} C ${box.cx + dir * 6} ${y - 2.4}, ${box.cx + dir * (spread - 1)} ${y - 1.4}, ${box.cx + dir * spread} ${y} C ${box.cx + dir * (spread - 1)} ${y + 1.4}, ${box.cx + dir * 6} ${y + 2.4}, ${box.cx + dir * 2.4} ${y} Z`

    return (
      <>
        <path d={leaf(1)} fill={theme.palette.accent} opacity="0.55" />
        <path d={leaf(-1)} fill={theme.palette.accent} opacity="0.55" />
        <circle cx={box.cx} cy={y} r="0.6" fill={theme.palette.accent} opacity="0.8" />
      </>
    )
  },

}
