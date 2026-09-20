'use client'

/**
 * The preview is the poster. This scales the exact same `PosterSvg` element the
 * exporter consumes, using a CSS transform — nothing is re-drawn at a different
 * size, so what you see is what gets written to the PDF.
 */
import { useEffect, useRef, useState } from 'react'
import { nearestStandard } from '@/lib/paper'
import { PosterSvg } from './PosterSvg'
import type { Theme } from '@/lib/themes/types'
import type { PosterLayout } from '@/lib/tree/layout'

/** CSS reference pixels per millimetre, i.e. 96dpi. */
const PX_PER_MM = 96 / 25.4

interface PosterPreviewProps {
  layout: PosterLayout
  theme: Theme
  svgRef: React.Ref<SVGSVGElement>
  onZoom: () => void
  onOpenStandalone: () => void
}

export function PosterPreview({
  layout,
  theme,
  svgRef,
  onZoom,
  onOpenStandalone,
}: PosterPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setFrame({ w: width, h: height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const standard = nearestStandard(layout.page)
  const naturalW = layout.page.w * PX_PER_MM
  const naturalH = layout.page.h * PX_PER_MM
  const scale =
    frame.w > 0 && frame.h > 0 ? Math.min(frame.w / naturalW, frame.h / naturalH, 1) : 0

  return (
    <div
      ref={frameRef}
      className="stage-ground relative flex h-full w-full items-center justify-center overflow-hidden p-6 lg:p-10"
    >
      {scale > 0 && (
        <div
          className="rounded-[2px] shadow-2xl shadow-black/50 ring-1 ring-black/20"
          style={{ width: naturalW * scale, height: naturalH * scale }}
        >
          <div
            style={{
              width: naturalW,
              height: naturalH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <PosterSvg ref={svgRef} layout={layout} theme={theme} />
          </div>
        </div>
      )}

      <div className="absolute right-4 top-4 flex gap-2">
      <button
        type="button"
        onClick={onOpenStandalone}
        aria-label="Open the poster in a new tab"
        title="Open in new tab"
        className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)]/80 text-[var(--ui-text)] backdrop-blur transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 4h5v5M16 4l-7 7M15 12v3.5A1.5 1.5 0 0 1 13.5 17h-9A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5H8" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoom}
        aria-label="Zoom in on the poster"
        title="Zoom"
        className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)]/80 text-[var(--ui-text)] backdrop-blur transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <circle cx="9" cy="9" r="5.5" />
          <path d="M9 6.8v4.4M6.8 9h4.4M13.5 13.5l3 3" />
        </svg>
      </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] tabular-nums text-[var(--ui-muted)]">
        {Math.round(layout.page.w)} × {Math.round(layout.page.h)} mm
        {standard && <> · fits {standard}</>} · {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
