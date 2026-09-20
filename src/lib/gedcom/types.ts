/** The slice of a GEDCOM record this app cares about: ancestry and identity. */
import type { DateParts } from '../dates'

export type Sex = 'M' | 'F' | 'U'

export interface LifeEvent {
  /** Astronomical year, negative for BCE. Null when the date is unparseable. */
  year: number | null
  /** Kept unformatted so the display format stays a live setting. */
  date: DateParts | null
  place: string | null
}

/** A marriage, carried on the child so the poster can label the join. */
export interface Marriage {
  date: DateParts | null
  year: number | null
  place: string | null
}

export interface Person {
  /** GEDCOM pointer, e.g. "@I1@". Stable identity across the app. */
  id: string
  given: string
  surname: string
  /** "Given SURNAME", or "Unknown" when the record carries no name at all. */
  fullName: string
  sex: Sex
  birth: LifeEvent | null
  death: LifeEvent | null
  fatherId: string | null
  motherId: string | null
  /** Marriage of this person's parents, drawn where their two lines meet. */
  parentsMarriage: Marriage | null
  /** Lowercased name + years, precomputed for the root-person search box. */
  haystack: string
}

export interface Genealogy {
  byId: Map<string, Person>
  /** All people, sorted by surname then given name. */
  people: Person[]
  fileName: string
  /** Individuals that have at least one known parent — good default roots. */
  withAncestors: number
}
