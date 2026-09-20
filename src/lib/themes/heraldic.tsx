/**
 * Héraldique — an armorial roll: parchment, tinctures of azure, gules and or,
 * a diapered ground, and a lion's head caboshed watching over the tree.
 */
import { CORMORANT, EB_GARAMOND } from './fonts'
import { LION } from './lion'
import type { Theme } from './types'

const PARCHMENT = '#F2E7CE'
const AZURE = '#1B3A6B'
const GULES = '#9E2B2B'
const OR = '#B08D3A'
const SABLE = '#2A2119'

/**
 * The charge, placed by the height you want it drawn at. Monochrome: a heraldic
 * charge takes the tincture of whatever it is set on.
 */
function LionCharge({
  fill,
  height,
  cx,
  cy,
  opacity = 1,
}: {
  fill: string
  height: number
  /** Centre of the charge, in mm. */
  cx: number
  cy: number
  opacity?: number
}) {
  const scale = height / LION.height
  const x = cx - (LION.width * scale) / 2
  const y = cy - height / 2
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) ${LION.shift}`} fill={fill} opacity={opacity}>
      {LION.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  )
}

export const heraldic: Theme = {
  id: 'heraldic',
  name: 'Héraldique',

  fonts: { display: CORMORANT, body: EB_GARAMOND },

  palette: {
    paper: PARCHMENT,
    ink: SABLE,
    inkMuted: '#6E5B41',
    accent: OR,

    nodeFill: '#FBF4E2',
    nodeStroke: AZURE,
    nodeInk: SABLE,

    rootFill: AZURE,
    rootStroke: OR,
    rootInk: '#F7EFD9',

    emptyFill: 'none',
    emptyStroke: '#C6B48C',
    emptyInk: '#B5A280',

    connector: '#7A6642',
    titleInk: AZURE,

    plaqueFill: '#F7EFD9',
    plaqueStroke: OR,
    plaqueInk: GULES,
  },

  page: { marginScale: 5.8, hairline: 0.2 },

  node: {
    radius: 0,
    strokeWidth: 0.26,
    emptyDash: '1.2 1.2',
    surnameCase: 'upper',
    surnameTracking: 0.1,
  },

  connector: {
    style: 'bracket',
    strokeWidth: 0.3,
    opacity: 0.8,
    cornerRadius: 1.8,
    junctionRadius: 0.55,
    mutedOpacity: 0.38,
  },

  background: {
    defs: () => (
      <>
        <linearGradient id="heraldic-wash" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#FAF2DF" />
          <stop offset="0.5" stopColor={PARCHMENT} />
          <stop offset="1" stopColor="#E6D7B6" />
        </linearGradient>

        {/* Diapering: the lozenge trellis that fills a plain heraldic field. */}
        <pattern id="heraldic-diaper" width="16" height="16" patternUnits="userSpaceOnUse">
          <path
            d="M 8 0 L 16 8 L 8 16 L 0 8 Z"
            fill="none"
            stroke={OR}
            strokeWidth="0.11"
            opacity="0.15"
          />
          <circle cx="8" cy="8" r="0.45" fill={OR} opacity="0.1" />
        </pattern>

        <radialGradient id="heraldic-vignette" cx="0.5" cy="0.45" r="0.76">
          <stop offset="0.5" stopColor="#4A3A1E" stopOpacity="0" />
          <stop offset="1" stopColor="#4A3A1E" stopOpacity="0.18" />
        </radialGradient>
      </>
    ),

    layer: (theme, page, margin) => {
      const inset = margin * 0.42
      const gap = 1.6
      // The charge sits centred, large and faint, as a watermark.
      const charge = Math.min(page.h * 0.5, page.w * 1.1)
      return (
        <>
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#heraldic-wash)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#heraldic-diaper)" />

          <LionCharge
            fill={OR}
            height={charge}
            cx={page.w / 2}
            cy={page.h / 2}
            opacity={0.15}
          />

          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#heraldic-vignette)" />

          {/* Azure and or keylines, as a roll of arms is ruled. */}
          <rect
            x={inset}
            y={inset}
            width={page.w - inset * 2}
            height={page.h - inset * 2}
            fill="none"
            stroke={AZURE}
            strokeWidth="0.6"
            opacity="0.7"
          />
          <rect
            x={inset + gap}
            y={inset + gap}
            width={page.w - (inset + gap) * 2}
            height={page.h - (inset + gap) * 2}
            fill="none"
            stroke={OR}
            strokeWidth="0.3"
            opacity="0.8"
          />

        </>
      )
    },
  },

  // A gold inner rule, the way a charge is fimbriated.
  nodeDecoration: (box, theme) => {
    if (box.isEmpty) return null
    const inset = 0.7
    return (
      <rect
        x={box.cx - box.w / 2 + inset}
        y={box.cy - box.h / 2 + inset}
        width={box.w - inset * 2}
        height={box.h - inset * 2}
        fill="none"
        stroke={box.isRoot ? theme.palette.rootInk : theme.palette.accent}
        strokeWidth="0.16"
        opacity={box.isRoot ? 0.5 : 0.7}
      />
    )
  },

}
