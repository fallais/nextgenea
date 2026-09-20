'use client'

/**
 * THE poster renderer. There is exactly one of these.
 *
 * The SVG is sized in real print millimetres — `width="420mm"` with a matching
 * `viewBox="0 0 420 594"` — so one user unit is one millimetre. The preview is
 * this same element scaled down with a CSS transform, and the PDF exporter
 * hands this same element to the PDF writer. There is no second drawing path,
 * so nothing can drift between what is on screen and what comes out of print.
 *
 * This component makes no styling decisions of its own: geometry and typography
 * come from the layout, and every colour, shape and flourish comes from the
 * theme object.
 */
import type { Theme } from '@/lib/themes/types'
import type { MarriagePlaque, NodeBox, PosterLayout, TextLine } from '@/lib/tree/layout'

interface PosterSvgProps {
  layout: PosterLayout
  theme: Theme
  ref?: React.Ref<SVGSVGElement>
  className?: string
}

function familyOf(line: TextLine, theme: Theme): string {
  return line.font === 'body' ? theme.fonts.body.fallback : theme.fonts.display.fallback
}

function Line({
  at,
  line,
  theme,
}: {
  at: { x: number; y: number }
  line: TextLine
  theme: Theme
}) {
  return (
    <text
      x={at.x + line.dx}
      y={at.y + line.dy}
      textAnchor={line.anchor === 'middle' ? 'middle' : undefined}
      fontFamily={familyOf(line, theme)}
      fontSize={line.size}
      fontWeight={line.weight}
      fill={line.fill}
      textLength={line.textLength}
      lengthAdjust={line.textLength ? 'spacing' : undefined}
    >
      {line.text}
    </text>
  )
}

function Card({ box, theme }: { box: NodeBox; theme: Theme }) {
  const { palette, node } = theme

  const fill = box.isRoot ? palette.rootFill : box.isEmpty ? palette.emptyFill : palette.nodeFill
  const stroke = box.isRoot
    ? palette.rootStroke
    : box.isEmpty
      ? palette.emptyStroke
      : palette.nodeStroke

  return (
    <g>
      <rect
        x={box.cx - box.w / 2}
        y={box.cy - box.h / 2}
        width={box.w}
        height={box.h}
        rx={node.radius || undefined}
        fill={fill}
        stroke={stroke}
        strokeWidth={box.isRoot ? node.strokeWidth * 1.6 : node.strokeWidth}
        strokeDasharray={box.isEmpty ? node.emptyDash : undefined}
        opacity={box.isEmpty ? 0.85 : 1}
      />

      {theme.nodeDecoration?.(box, theme)}

      {/* A turned card keeps its text in the card's own frame. */}
      {box.rotated ? (
        <g transform={`rotate(-90 ${box.cx} ${box.cy})`}>
          {box.lines.map((line, i) => (
            <Line key={i} at={{ x: box.cx, y: box.cy }} line={line} theme={theme} />
          ))}
        </g>
      ) : (
        box.lines.map((line, i) => (
          <Line key={i} at={{ x: box.cx, y: box.cy }} line={line} theme={theme} />
        ))
      )}
    </g>
  )
}

/** The plate where a couple's two lines meet, carrying their marriage. */
function Plaque({ plaque, theme }: { plaque: MarriagePlaque; theme: Theme }) {
  const { palette } = theme
  return (
    <g>
      <rect
        x={plaque.x - plaque.w / 2}
        y={plaque.y - plaque.h / 2}
        width={plaque.w}
        height={plaque.h}
        rx={theme.node.radius || undefined}
        fill={palette.plaqueFill}
        stroke={palette.plaqueStroke}
        strokeWidth={theme.page.hairline}
      />
      {plaque.lines.map((line, i) => (
        <Line key={i} at={{ x: plaque.x, y: plaque.y }} line={line} theme={theme} />
      ))}
    </g>
  )
}

export function PosterSvg({ layout, theme, ref, className }: PosterSvgProps) {
  const { page, title } = layout
  const { palette, connector } = theme

  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={`${page.w}mm`}
      height={`${page.h}mm`}
      viewBox={`0 0 ${page.w} ${page.h}`}
      style={{ display: 'block' }}
    >
      <defs>{theme.background.defs?.(theme)}</defs>

      {/* Paper. Always painted, so the PDF has an explicit ground. */}
      <rect x="0" y="0" width={page.w} height={page.h} fill={palette.paper} />
      {theme.background.layer?.(theme, page, layout.margin)}

      <g
        fill="none"
        stroke={palette.connector}
        strokeWidth={connector.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {layout.connectors.map((line, i) => (
          <path
            key={i}
            d={line.path}
            opacity={line.muted ? connector.opacity * connector.mutedOpacity : connector.opacity}
          />
        ))}
      </g>

      {connector.junctionRadius > 0 && (
        <g fill={palette.connector} opacity={connector.opacity}>
          {layout.junctions.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r={connector.junctionRadius} />
          ))}
        </g>
      )}

      {layout.plaques.map((plaque, i) => (
        <Plaque key={i} plaque={plaque} theme={theme} />
      ))}

      {layout.nodes.map((box) => (
        <Card key={box.slot.ahnentafel} box={box} theme={theme} />
      ))}

      <text
        x={title.x}
        y={title.baseline}
        textAnchor={title.align === 'right' ? 'end' : undefined}
        fontFamily={theme.fonts.display.fallback}
        fontSize={title.size}
        fontWeight={700}
        fill={palette.titleInk}
      >
        {title.text}
      </text>

    </svg>
  )
}
