'use client'

/**
 * Full-screen inspector for the poster.
 *
 * This renders the very same `PosterSvg` the stage does — only its size
 * differs, so it is still one artifact, not a second drawing path. The caller
 * unmounts the stage while this is open: two live instances would put two
 * copies of the theme's `<defs>` in the document, and SVG ids are
 * document-global, so `url(#…)` would silently bind to whichever came first.
 *
 * Zooming sets the SVG's rendered width and height rather than applying a CSS
 * transform. A transform rasterises the element once and scales the bitmap,
 * which is why magnified type looked soft; giving the SVG a real size makes the
 * browser re-render the vectors, so it stays sharp at any magnification. Panning
 * is then just native scrolling, which is smoother than moving a huge layer.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { describePageBox } from '@/lib/paper'
import type { Theme } from '@/lib/themes/types'
import type { PosterLayout } from '@/lib/tree/layout'
import { PosterSvg } from './PosterSvg'

/** CSS reference pixels per millimetre, i.e. 96dpi. */
const PX_PER_MM = 96 / 25.4
const MIN_SCALE = 0.01
const MAX_SCALE = 12
const STEP = 1.35

interface PosterZoomModalProps {
  layout: PosterLayout
  theme: Theme
  svgRef: React.Ref<SVGSVGElement>
  onClose: () => void
  onOpenStandalone: () => void
}

export function PosterZoomModal({
  layout,
  theme,
  svgRef,
  onClose,
  onOpenStandalone,
}: PosterZoomModalProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState<number | null>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const naturalW = layout.page.w * PX_PER_MM
  const naturalH = layout.page.h * PX_PER_MM

  const fitScale = useCallback(
    (frame: HTMLDivElement) =>
      Math.min(frame.clientWidth / naturalW, frame.clientHeight / naturalH) * 0.94,
    [naturalW, naturalH],
  )

  // Measured from the ref callback rather than an effect: the size is known at
  // commit, so the sheet is placed without a second render pass.
  const attachFrame = useCallback(
    (frame: HTMLDivElement | null) => {
      frameRef.current = frame
      if (frame) setScale((current) => current ?? fitScale(frame))
    },
    [fitScale],
  )

  const resetFit = useCallback(() => {
    const frame = frameRef.current
    if (frame) setScale(fitScale(frame))
  }, [fitScale])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === '0') resetFit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, resetFit])

  /** Zoom keeping the point under the cursor fixed, via the scroll offset. */
  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const frame = frameRef.current
      if (!frame) return
      setScale((current) => {
        if (current == null) return current
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor))
        const rect = frame.getBoundingClientRect()
        const vx = (clientX ?? rect.left + rect.width / 2) - rect.left
        const vy = (clientY ?? rect.top + rect.height / 2) - rect.top
        // Where the cursor sits in unscaled poster space.
        const px = (frame.scrollLeft + vx) / current
        const py = (frame.scrollTop + vy) / current
        requestAnimationFrame(() => {
          frame.scrollLeft = px * next - vx
          frame.scrollTop = py * next - vy
        })
        return next
      })
    },
    [],
  )

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomAt(Math.pow(STEP, -event.deltaY / 120), event.clientX, event.clientY)
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const percent = scale ? Math.round(scale * 100) : 0
  const iconButton =
    'grid h-8 w-8 place-items-center rounded-lg border border-[var(--ui-border)] text-[var(--ui-text)] transition-colors hover:border-[var(--ui-accent)]'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Poster zoom"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--ui-shell)]"
    >
      <header className="flex items-center gap-3 border-b border-[var(--ui-border)] px-4 py-2.5">
        <span className="truncate text-sm font-medium text-[var(--ui-text)]">
          {layout.title.text}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--ui-muted)]">
          {describePageBox(layout.page)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenStandalone}
            className="mr-2 rounded-lg border border-[var(--ui-border)] px-2.5 py-1.5 text-xs text-[var(--ui-text)] transition-colors hover:border-[var(--ui-accent)]"
            title="Open the SVG in a new tab, in the browser's own viewer"
          >
            Open in new tab
          </button>

          <button type="button" onClick={() => zoomAt(1 / STEP)} aria-label="Zoom out" className={iconButton}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <path d="M5 10h10" />
            </svg>
          </button>

          <button
            type="button"
            onClick={resetFit}
            className="min-w-[4.5rem] rounded-lg border border-[var(--ui-border)] px-2 py-1.5 text-xs tabular-nums text-[var(--ui-text)] transition-colors hover:border-[var(--ui-accent)]"
            title="Fit to window (0)"
          >
            {percent}%
          </button>

          <button type="button" onClick={() => zoomAt(STEP)} aria-label="Zoom in" className={iconButton}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <path d="M10 5v10M5 10h10" />
            </svg>
          </button>

          <button type="button" onClick={onClose} aria-label="Close zoom" className={`ml-2 ${iconButton}`}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <path d="m6 6 8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>
      </header>

      <div
        ref={attachFrame}
        className="stage-ground sidebar-scroll relative flex-1 cursor-grab select-none overflow-auto active:cursor-grabbing"
        onPointerDown={(event) => {
          const frame = frameRef.current
          if (!frame) return
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: frame.scrollLeft,
            top: frame.scrollTop,
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          const frame = frameRef.current
          if (!drag || !frame) return
          frame.scrollLeft = drag.left - (event.clientX - drag.x)
          frame.scrollTop = drag.top - (event.clientY - drag.y)
        }}
        onPointerUp={(event) => {
          dragRef.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
      >
        {/*
          `safe` centring is load-bearing: plain `center` overflows a scroll
          container on both sides and the leading half becomes unreachable, so
          scrollLeft pins to a maximum well short of the content. `safe` falls
          back to start alignment as soon as the poster is larger than the frame.
        */}
        <div className="flex min-h-full min-w-full p-6 [align-items:safe_center] [justify-content:safe_center]">
          {scale != null && (
            <div
              className="zoom-canvas shrink-0 shadow-2xl shadow-black/50"
              style={{ width: naturalW * scale, height: naturalH * scale }}
            >
              <PosterSvg ref={svgRef} layout={layout} theme={theme} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
