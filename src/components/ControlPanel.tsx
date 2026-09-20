'use client'

import { DATE_FORMAT_LABELS, type DateFormat } from '@/lib/dates'
import { fitsInPdf, userUnitFor, type PageBox } from '@/lib/paper'
import { THEMES } from '@/lib/themes'
import { MAX_GENERATIONS, MIN_GENERATIONS } from '@/lib/tree/ancestry'
import type { Ancestry } from '@/lib/tree/ancestry'
import type {
  DirectionSetting,
  TitleAlign,
  TreeDirection,
  TypeScale,
  VerticalFrom,
} from '@/lib/tree/layout'
import type { Genealogy, Person } from '@/lib/gedcom/types'
import type { PosterConfig } from '@/lib/config'
import { Field, Panel, Segmented } from './ui'
import { RootPersonSelect } from './RootPersonSelect'

interface ControlPanelProps {
  genealogy: Genealogy
  config: PosterConfig
  onChange: (patch: Partial<PosterConfig>) => void
  root: Person | null
  ancestry: Ancestry | null
  direction: TreeDirection | null
  oversize: boolean
  reachable: number
  page: PageBox | null
  exporting: 'pdf' | 'svg' | null
  exportError: string | null
  onExportPdf: () => void
  onExportSvg: () => void
  onReset: () => void
}

export function ControlPanel({
  genealogy,
  config,
  onChange,
  root,
  ancestry,
  direction,
  oversize,
  reachable,
  page,
  exporting,
  exportError,
  onExportPdf,
  onExportSvg,
  onReset,
}: ControlPanelProps) {
  const generations = Array.from(
    { length: MAX_GENERATIONS - MIN_GENERATIONS + 1 },
    (_, i) => MIN_GENERATIONS + i,
  )

  // A PDF page tops out at 200 inches a side; past that it needs /UserUnit,
  // which not every viewer honours, and past that again it cannot be done.
  const pdfPossible = page ? fitsInPdf(page) : true
  const userUnit = page ? userUnitFor(page) : 1

  const toggle = (
    label: string,
    key: 'showEmpty' | 'showPlaces' | 'showMarriages',
    on: string,
    off: string,
  ) => (
    <Field label={label}>
      <Segmented
        value={config[key] ? 'on' : 'off'}
        onChange={(value) => onChange({ [key]: value === 'on' } as Partial<PosterConfig>)}
        options={[
          { value: 'on', label: on },
          { value: 'off', label: off },
        ]}
      />
    </Field>
  )

  return (
    <aside className="sidebar-scroll flex h-full w-full flex-col gap-4 overflow-y-auto border-r border-[var(--ui-border)] bg-[var(--ui-shell)] p-4 lg:w-[300px] lg:shrink-0">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-[var(--ui-text)]">
            {genealogy.fileName}
          </h1>
          <p className="text-[11px] text-[var(--ui-muted)]">
            {genealogy.people.length.toLocaleString()} people ·{' '}
            {genealogy.withAncestors.toLocaleString()} with parents
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-lg border border-[var(--ui-border)] px-2.5 py-1.5 text-xs text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-text)]"
        >
          Change file
        </button>
      </header>

      <Panel className="space-y-4">
        <Field label="Root person">
          <RootPersonSelect
            people={genealogy.people}
            selectedId={config.rootId}
            onSelect={(rootId) => onChange({ rootId })}
          />
        </Field>

        <Field label="Title" hint={config.title.trim() ? undefined : 'follows the root'}>
          <input
            type="text"
            value={config.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={root?.fullName ?? 'Poster title'}
            aria-label="Poster title"
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-accent)] focus:outline-none"
          />
        </Field>

        <Field label="Title position">
          <Segmented
            value={config.titleAlign}
            onChange={(value) => onChange({ titleAlign: value as TitleAlign })}
            options={[
              { value: 'left', label: 'Bottom left' },
              { value: 'right', label: 'Bottom right' },
            ]}
          />
        </Field>

        <Field
          label="Generations"
          hint={
            reachable && config.generations > reachable
              ? `only ${reachable} recorded`
              : ancestry
                ? `${ancestry.filled} of ${ancestry.total} known`
                : undefined
          }
        >
          <select
            value={config.generations}
            onChange={(event) => onChange({ generations: Number(event.target.value) })}
            aria-label="Generations"
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none"
          >
            {generations.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Tree direction"
          hint={
            config.direction === 'auto' && direction
              ? `auto → ${direction === 'up' ? 'upward' : 'rightward'}`
              : undefined
          }
        >
          <Segmented
            value={config.direction}
            onChange={(value) => onChange({ direction: value as DirectionSetting })}
            options={[
              { value: 'auto', label: 'Auto', title: 'Whichever gives the less extreme sheet' },
              { value: 'up', label: 'Upward', title: 'Root at the bottom, parents above' },
              { value: 'right', label: 'Rightward', title: 'Root at the left, parents to the right' },
            ]}
          />
        </Field>

        <Field label="Type size">
          <Segmented
            value={config.typeScale}
            onChange={(value) => onChange({ typeScale: value as TypeScale })}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'standard', label: 'Standard' },
              { value: 'generous', label: 'Generous' },
            ]}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4">
        <Field
          label="Vertical text"
          hint={config.verticalFrom === 'off' ? undefined : 'narrows deep cards'}
        >
          <select
            value={String(config.verticalFrom)}
            onChange={(event) =>
              onChange({
                verticalFrom: (event.target.value === 'off'
                  ? 'off'
                  : Number(event.target.value)) as VerticalFrom,
              })
            }
            aria-label="Vertical text"
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none"
          >
            <option value="off">Off</option>
            {Array.from({ length: MAX_GENERATIONS - 1 }, (_, i) => i + 1).map(
              (generation) => (
                <option key={generation} value={generation}>
                  From generation {generation}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Date format">
          <select
            value={config.dateFormat}
            onChange={(event) => onChange({ dateFormat: event.target.value as DateFormat })}
            aria-label="Date format"
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none"
          >
            {(Object.keys(DATE_FORMAT_LABELS) as DateFormat[]).map((format) => (
              <option key={format} value={format}>
                {DATE_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </Field>

        {toggle('Birth & death places', 'showPlaces', 'Show', 'Hide')}
        {toggle('Marriages', 'showMarriages', 'Show', 'Hide')}
        {toggle('Unknown ancestors', 'showEmpty', 'Placeholder', 'Omit')}
      </Panel>

      <Panel>
        <Field label="Theme">
          <select
            value={config.themeId}
            onChange={(event) => onChange({ themeId: event.target.value })}
            aria-label="Theme"
            className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none"
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </Field>
      </Panel>

      <div className="mt-auto space-y-2 pt-2">
        {oversize && (
          <p role="alert" className="rounded-lg bg-amber-500/15 px-3 py-2 text-[12px] leading-snug text-amber-200">
            This chart has run past any sensible size. Reduce the generations or
            the type size.
          </p>
        )}
        {exportError && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            {exportError}
          </p>
        )}

        <button
          type="button"
          onClick={onExportSvg}
          disabled={exporting !== null || !root}
          className="w-full rounded-lg bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-[var(--ui-accent-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'svg' ? 'Building SVG…' : 'Download SVG'}
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          disabled={exporting !== null || !root || !pdfPossible}
          title={
            !pdfPossible
              ? 'Larger than a PDF page can be — use SVG'
              : userUnit > 1
                ? `Uses ×${userUnit} UserUnit scaling; SVG is exact`
                : undefined
          }
          className="w-full rounded-lg border border-[var(--ui-border)] px-4 py-2.5 text-sm font-medium text-[var(--ui-text)] transition-colors hover:border-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting === 'pdf' ? 'Building PDF…' : 'Download PDF'}
        </button>

      </div>
    </aside>
  )
}
