/**
 * GEDCOM parsing. Runs entirely in the browser — the file bytes never leave the
 * user's machine. `read-gedcom` is imported dynamically so the parser (and its
 * bundle weight) is only pulled in once a file is actually dropped.
 */
import type { ValueDate, ValuePartDate } from 'read-gedcom'
import type { DateParts, DateQualifier } from '../dates'
import type { Genealogy, LifeEvent, Marriage, Person, Sex } from './types'

/**
 * Pull the most representative date part out of a GEDCOM date value. GEDCOM
 * dates can be punctual ("1842"), ranges ("BET 1840 AND 1845") or periods
 * ("FROM 1840 TO 1845"); for a poster we only ever show one anchor date.
 */
function anchorPart(date: ValueDate): ValuePartDate | undefined {
  if ('date' in date && date.date) return date.date
  if ('dateFrom' in date && date.dateFrom) return date.dateFrom
  if ('dateAfter' in date && date.dateAfter) return date.dateAfter
  if ('dateTo' in date && date.dateTo) return date.dateTo
  if ('dateBefore' in date && date.dateBefore) return date.dateBefore
  return undefined
}

/** Astronomical year: BCE years come back negative. */
function partYear(part: ValuePartDate): number {
  return part.year.isBce ? -part.year.value : part.year.value
}

/** How sure the record was about the date. */
function qualifierOf(date: ValueDate): DateQualifier {
  if (date.isDateApproximated) return 'about'
  if (date.isDateRange) {
    if ('dateBefore' in date && !('dateAfter' in date)) return 'before'
    if ('dateAfter' in date && !('dateBefore' in date)) return 'after'
  }
  return null
}

function toParts(date: ValueDate): DateParts | null {
  const part = anchorPart(date)
  if (!part) {
    const phrase = 'phrase' in date ? date.phrase : undefined
    return phrase ? { year: null, phrase } : null
  }
  return {
    year: partYear(part),
    month: 'month' in part ? part.month : undefined,
    day: 'day' in part ? part.day : undefined,
    qualifier: qualifierOf(date),
  }
}

function toLifeEvent(date: ValueDate | null, place: string | null): LifeEvent | null {
  if (!date) return place ? { year: null, date: null, place } : null
  const parts = toParts(date)
  return { year: parts?.year ?? null, date: parts, place }
}

function normaliseSex(raw: string | null | undefined): Sex {
  if (raw === 'M' || raw === 'F') return raw
  return 'U'
}

/** Collapse whitespace and strip the GEDCOM surname slashes if any leaked through. */
function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\//g, '').replace(/\s+/g, ' ').trim()
}

/** The marriage recorded on a family, if it carries a date or a place. */
function toMarriage(date: ValueDate | null, place: string | null): Marriage | null {
  if (!date && !place) return null
  const parts = date ? toParts(date) : null
  return { date: parts, year: parts?.year ?? null, place }
}

export async function parseGedcomFile(file: File): Promise<Genealogy> {
  const { readGedcom } = await import('read-gedcom')
  const buffer = await file.arrayBuffer()
  const gedcom = readGedcom(buffer)

  const byId = new Map<string, Person>()

  for (const indi of gedcom.getIndividualRecord().arraySelect()) {
    const id = indi.pointer()[0]
    if (!id) continue

    const name = indi.getName()
    // Prefer the structured GIVN/SURN sub-tags; fall back to slicing the
    // "Given /Surname/" value, which is what most files actually carry.
    const parts = name.valueAsParts()[0]
    const given = clean(name.getGivenName().valueNonNull()[0] ?? parts?.[0])
    const surname = clean(name.getSurname().valueNonNull()[0] ?? parts?.[1])

    const birthEvent = indi.getEventBirth()
    const deathEvent = indi.getEventDeath()
    const birth = toLifeEvent(
      birthEvent.getDate().valueAsDate()[0] ?? null,
      clean(birthEvent.getPlace().value()[0]) || null,
    )
    const death = toLifeEvent(
      deathEvent.getDate().valueAsDate()[0] ?? null,
      clean(deathEvent.getPlace().value()[0]) || null,
    )

    // A person can technically be a child in several families (adoption etc.);
    // the first is the pedigree line we follow.
    const family = indi.getFamilyAsChild().arraySelect()[0]
    const fatherId = family?.getHusband().getIndividualRecord().pointer()[0] ?? null
    const motherId = family?.getWife().getIndividualRecord().pointer()[0] ?? null

    const marriageEvent = family?.getEventMarriage()
    const parentsMarriage = marriageEvent
      ? toMarriage(
          marriageEvent.getDate().valueAsDate()[0] ?? null,
          clean(marriageEvent.getPlace().value()[0]) || null,
        )
      : null

    const fullName = [given, surname].filter(Boolean).join(' ') || 'Unknown'
    const years = [birth?.year, death?.year].filter((y) => y != null).join(' ')

    byId.set(id, {
      id,
      given,
      surname,
      fullName,
      sex: normaliseSex(indi.getSex().value()[0]),
      birth,
      death,
      fatherId,
      motherId,
      parentsMarriage,
      haystack: `${fullName} ${years}`.toLowerCase(),
    })
  }

  const people = [...byId.values()].sort(
    (a, b) =>
      a.surname.localeCompare(b.surname) ||
      a.given.localeCompare(b.given) ||
      a.id.localeCompare(b.id),
  )

  const withAncestors = people.filter((p) => p.fatherId || p.motherId).length

  return { byId, people, fileName: file.name, withAncestors }
}
