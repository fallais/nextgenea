'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ControlPanel } from '@/components/ControlPanel'
import { Dropzone } from '@/components/Dropzone'
import { PosterPreview } from '@/components/PosterPreview'
import { PosterZoomModal } from '@/components/PosterZoomModal'
import type { PosterConfig } from '@/lib/config'
import { parseGedcomFile } from '@/lib/gedcom/parse'
import type { Genealogy } from '@/lib/gedcom/types'
import { posterFileName } from '@/lib/fonts'
import { exportPosterPdf, exportPosterTiledPdf } from '@/lib/pdf/export'
import { planTiles } from '@/lib/pdf/tile'
import { buildPosterSvg, exportPosterSvg } from '@/lib/svg/export'
import { DEFAULT_THEME_ID, getTheme } from '@/lib/themes'
import { buildAncestry, deepestRoot, reachableDepth } from '@/lib/tree/ancestry'
import { layoutPoster } from '@/lib/tree/layout'

const INITIAL_CONFIG: PosterConfig = {
  rootId: null,
  generations: 5,
  direction: 'up',
  nameSize: 3.1,
  themeId: DEFAULT_THEME_ID,
  title: '',
  titleAlign: 'left',
  verticalFrom: 9,
  dateFormat: 'french',
  tileSheet: 'off',
  showEmpty: false,
  showPlaces: true,
  showMarriages: true,
}

export default function Home() {
  const [genealogy, setGenealogy] = useState<Genealogy | null>(null)
  const [config, setConfig] = useState<PosterConfig>(INITIAL_CONFIG)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'svg' | 'tiles' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setParsing(true)
    setParseError(null)
    try {
      const parsed = await parseGedcomFile(file)
      if (parsed.people.length === 0) {
        setParseError('That file parsed, but it contains no individuals.')
        return
      }
      // Start from whoever has the deepest recorded ancestry — the most
      // rewarding root, and almost always the intended one.
      const best = deepestRoot(parsed.byId) ?? parsed.people[0].id

      setGenealogy(parsed)
      setConfig((current) => ({ ...current, rootId: best }))
    } catch (error) {
      setParseError(
        error instanceof Error
          ? `Could not read that file: ${error.message}`
          : 'Could not read that file.',
      )
    } finally {
      setParsing(false)
    }
  }, [])

  const patchConfig = useCallback((patch: Partial<PosterConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
    setExportError(null)
  }, [])

  const theme = getTheme(config.themeId)

  const root = genealogy && config.rootId ? (genealogy.byId.get(config.rootId) ?? null) : null

  const ancestry = useMemo(
    () =>
      genealogy && config.rootId
        ? buildAncestry(genealogy.byId, config.rootId, config.generations)
        : null,
    [genealogy, config.rootId, config.generations],
  )

  /** Depth actually recorded for the chosen root, for the generations hint. */
  const reachable = useMemo(
    () => (genealogy && config.rootId ? reachableDepth(genealogy.byId, config.rootId) : 0),
    [genealogy, config.rootId],
  )

  const layout = useMemo(() => {
    if (!ancestry || !root || !genealogy) return null
    return layoutPoster({
      ancestry,
      theme,
      direction: config.direction,
      nameSize: config.nameSize,
      showEmpty: config.showEmpty,
      showPlaces: config.showPlaces,
      showMarriages: config.showMarriages,
      title: config.title.trim() || root.fullName,
      titleAlign: config.titleAlign,
      verticalFrom: config.verticalFrom,
      dateFormat: config.dateFormat,
    })
  }, [ancestry, root, genealogy, theme, config])

  const poster = layout

  /** The grid the poster would be split across, once a sheet is chosen. */
  const tilePlan = useMemo(
    () =>
      poster && config.tileSheet !== 'off'
        ? planTiles(poster.page, { sheet: config.tileSheet, orientation: 'auto' })
        : null,
    [poster, config.tileSheet],
  )

  const runExport = useCallback(
    async (kind: 'pdf' | 'svg' | 'tiles') => {
      if (!svgRef.current || !root || !poster) return
      setExporting(kind)
      setExportError(null)
      try {
        const fileName = posterFileName(
          root.fullName,
          config.generations,
          kind === 'svg' ? 'svg' : 'pdf',
        )
        if (kind === 'svg') {
          await exportPosterSvg({ svg: svgRef.current, theme, fileName })
        } else if (kind === 'tiles' && tilePlan) {
          await exportPosterTiledPdf({
            svg: svgRef.current,
            page: poster.page,
            theme,
            fileName,
            plan: tilePlan,
          })
        } else {
          await exportPosterPdf({ svg: svgRef.current, page: poster.page, theme, fileName })
        }
      } catch (error) {
        setExportError(
          error instanceof Error ? `Export failed: ${error.message}` : 'Export failed.',
        )
      } finally {
        setExporting(null)
      }
    },
    [root, poster, theme, config.generations, tilePlan],
  )

  /**
   * Hand the poster to the browser's own SVG viewer, which pans and zooms
   * better than anything worth rebuilding here.
   */
  const openStandalone = useCallback(async () => {
    if (!svgRef.current) return
    try {
      const xml = await buildPosterSvg(svgRef.current, theme)
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
      window.open(url, '_blank', 'noopener')
      // Held long enough for the new tab to have loaded it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      setExportError(
        error instanceof Error ? `Could not open: ${error.message}` : 'Could not open.',
      )
    }
  }, [theme])

  const handleReset = useCallback(() => {
    setGenealogy(null)
    setConfig(INITIAL_CONFIG)
    setParseError(null)
    setExportError(null)
  }, [])

  if (genealogy && poster && zoomed) {
    return (
      <main className="h-dvh bg-[var(--ui-shell)]">
        <PosterZoomModal
          layout={poster}
          theme={theme}
          svgRef={svgRef}
          onClose={() => setZoomed(false)}
          onOpenStandalone={openStandalone}
        />
      </main>
    )
  }

  if (!genealogy) {
    return (
      <main className="min-h-dvh bg-[var(--ui-shell)]">
        <Dropzone onFile={handleFile} busy={parsing} error={parseError} />
      </main>
    )
  }

  return (
    <main
     
      className="flex h-dvh flex-col bg-[var(--ui-shell)] lg:flex-row"
    >
      <ControlPanel
        genealogy={genealogy}
        config={config}
        onChange={patchConfig}
        root={root}
        ancestry={ancestry}
        direction={poster?.direction ?? null}
        card={poster?.card ?? null}
        oversize={poster?.oversize ?? false}
        reachable={reachable}
        page={poster?.page ?? null}
        exporting={exporting}
        exportError={exportError}
        tilePlan={tilePlan}
        onExportPdf={() => runExport('pdf')}
        onExportSvg={() => runExport('svg')}
        onExportTiles={() => runExport('tiles')}
        onReset={handleReset}
      />

      <div className="min-h-0 flex-1">
        {poster ? (
          <PosterPreview
            layout={poster}
            theme={theme}
            svgRef={svgRef}
            onZoom={() => setZoomed(true)}
            onOpenStandalone={openStandalone}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[var(--ui-muted)]">
            Choose a root person to draw the chart.
          </div>
        )}
      </div>
    </main>
  )
}
