'use client'

/**
 * Root person as a plain setting.
 *
 * This is a tool for preparing a poster, not for doing genealogy — the root is
 * one design choice among the others, so it gets one compact control rather
 * than a search interface. A native select also copes with very large files
 * and supports type-to-jump for free.
 */
import { useMemo } from 'react'
import type { Person } from '@/lib/gedcom/types'

/**
 * A single year is enough to tell namesakes apart, and a native select cannot
 * ellipsize — a full lifespan gets clipped mid-number in a narrow sidebar.
 */
function anchorYear(person: Person): string {
  const birth = person.birth?.year
  if (birth != null) return `${birth}`
  const death = person.death?.year
  if (death != null) return `d. ${death}`
  return '—'
}

export function RootPersonSelect({
  people,
  selectedId,
  onSelect,
}: {
  people: Person[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const options = useMemo(
    () =>
      people.map((person) => ({
        id: person.id,
        label: `${person.surname || '—'}, ${person.given || '?'} · ${anchorYear(person)}`,
      })),
    [people],
  )

  return (
    <select
      value={selectedId ?? ''}
      onChange={(event) => onSelect(event.target.value)}
      aria-label="Root person"
      className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)] px-3 py-2 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
