/**
 * Archival — a warm letterpress register, the way a parish record or an
 * engraved certificate is set: ivory stock, sepia ink, a double keyline frame
 * and small caps surnames.
 */
import { EB_GARAMOND } from './fonts'
import type { Theme } from './types'

const INK = '#2E2620'
const ACCENT = '#8A6A3B'
const PAPER = '#F3ECDD'

export const archival: Theme = {
  id: 'archival',
  name: 'Archival',

  fonts: { display: EB_GARAMOND, body: EB_GARAMOND },

  palette: {
    paper: PAPER,
    ink: INK,
    inkMuted: '#6B5B49',
    accent: ACCENT,

    nodeFill: '#FBF7EC',
    nodeStroke: '#B6A288',
    nodeInk: INK,

    rootFill: INK,
    rootStroke: INK,
    rootInk: '#F7F1E3',

    emptyFill: 'none',
    emptyStroke: '#C9BBA4',
    emptyInk: '#B9A88E',

    connector: '#8C7A62',
    titleInk: INK,

    plaqueFill: '#FBF7EC',
    plaqueStroke: '#B6A288',
    plaqueInk: '#5A4A38',
  },

  page: { marginScale: 5.4, hairline: 0.18 },

  node: {
    radius: 0,
    strokeWidth: 0.25,
    emptyDash: '1.1 1.1',
    surnameCase: 'upper',
    surnameTracking: 0.09,
  },

  connector: {
    style: 'bracket',
    strokeWidth: 0.28,
    opacity: 0.72,
    cornerRadius: 2.2,
    junctionRadius: 0.42,
    mutedOpacity: 0.4,
  },

  background: {
    defs: () => (
      <>
        <linearGradient id="archival-wash" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#FCF7EC" />
          <stop offset="0.55" stopColor={PAPER} />
          <stop offset="1" stopColor="#E8DCC6" />
        </linearGradient>
        {/* Fine crosshatch standing in for laid paper fibre. */}
        <pattern
          id="archival-hatch"
          width="2.4"
          height="2.4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="2.4" stroke={ACCENT} strokeWidth="0.13" opacity="0.085" />
        </pattern>
        <radialGradient id="archival-vignette" cx="0.5" cy="0.42" r="0.78">
          <stop offset="0.45" stopColor="#3B2E1E" stopOpacity="0" />
          <stop offset="1" stopColor="#3B2E1E" stopOpacity="0.17" />
        </radialGradient>
      </>
    ),

    layer: (theme, page, margin) => {
      const inset = margin * 0.42
      const gap = 1.4
      const corners: [number, number][] = [
        [inset, inset],
        [page.w - inset, inset],
        [inset, page.h - inset],
        [page.w - inset, page.h - inset],
      ]

      return (
        <>
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#archival-wash)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#archival-hatch)" />
          <rect x="0" y="0" width={page.w} height={page.h} fill="url(#archival-vignette)" />

          <rect
            x={inset}
            y={inset}
            width={page.w - inset * 2}
            height={page.h - inset * 2}
            fill="none"
            stroke={ACCENT}
            strokeWidth="0.5"
            opacity="0.5"
          />
          <rect
            x={inset + gap}
            y={inset + gap}
            width={page.w - (inset + gap) * 2}
            height={page.h - (inset + gap) * 2}
            fill="none"
            stroke={ACCENT}
            strokeWidth="0.16"
            opacity="0.45"
          />

          {/* Lozenge fleurons where the keylines meet. */}
          {corners.map(([x, y], i) => (
            <path
              key={i}
              d={`M ${x} ${y - 1.7} L ${x + 1.7} ${y} L ${x} ${y + 1.7} L ${x - 1.7} ${y} Z`}
              fill={PAPER}
              stroke={ACCENT}
              strokeWidth="0.22"
              opacity="0.85"
            />
          ))}
        </>
      )
    },
  },

  // Inner hairline, the second impression of a letterpress rule.
  nodeDecoration: (box, theme) => {
    if (box.isEmpty || box.isRoot) return null
    const inset = 0.62
    return (
      <rect
        x={box.cx - box.w / 2 + inset}
        y={box.cy - box.h / 2 + inset}
        width={box.w - inset * 2}
        height={box.h - inset * 2}
        fill="none"
        stroke={theme.palette.nodeStroke}
        strokeWidth="0.11"
        opacity="0.6"
      />
    )
  },

}
