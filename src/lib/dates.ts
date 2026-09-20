/**
 * Date presentation.
 *
 * GEDCOM dates are parsed into parts and formatted late, at layout time, so
 * changing the format re-renders the poster without re-reading the file.
 */

export type DateFormat = 'french' | 'frenchNumeric' | 'english' | 'iso'

/** Roughly how precise a GEDCOM date was. */
export type DateQualifier = 'about' | 'before' | 'after' | null

export interface DateParts {
  /** Astronomical year, negative for BCE. Null when only a phrase survived. */
  year: number | null
  /** 1-12 when the record gave a month. */
  month?: number
  day?: number
  qualifier?: DateQualifier
  /** Free text from a date the parser could not read, e.g. "before the war". */
  phrase?: string
}

const MONTHS: Record<DateFormat, string[]> = {
  french: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
  frenchNumeric: [],
  english: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ],
  iso: [],
}

const QUALIFIERS: Record<DateFormat, Record<Exclude<DateQualifier, null>, string>> = {
  french: { about: 'vers', before: 'avant', after: 'après' },
  frenchNumeric: { about: 'vers', before: 'avant', after: 'après' },
  english: { about: 'c.', before: 'bef.', after: 'aft.' },
  // Mathematical comparison signs are outside the subsetted charset.
  iso: { about: '~', before: '<', after: '>' },
}

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  french: 'French — 12 mars 1842',
  frenchNumeric: 'French numeric — 12/03/1842',
  english: 'English — 12 Mar 1842',
  iso: 'ISO — 1842-03-12',
}

const pad = (value: number) => String(value).padStart(2, '0')

function withQualifier(text: string, qualifier: DateQualifier, format: DateFormat): string {
  if (!qualifier || !text) return text
  const mark = QUALIFIERS[format][qualifier]
  // The ISO marks are symbols, so they sit tight against the date.
  return format === 'iso' ? `${mark}${text}` : `${mark} ${text}`
}

/** Year alone, which is all a card has room for. */
export function formatYear(parts: DateParts | null, format: DateFormat): string {
  if (!parts || parts.year == null) return ''
  const year = Math.abs(parts.year)
  const text = parts.year < 0 ? `${year} BC` : String(year)
  return withQualifier(text, parts.qualifier ?? null, format)
}

/** The fullest form the record supports, for the marriage plate. */
export function formatDate(parts: DateParts | null, format: DateFormat): string {
  if (!parts) return ''
  if (parts.year == null) return parts.phrase ?? ''

  const year = Math.abs(parts.year)
  const era = parts.year < 0 ? ' BC' : ''
  const { month, day } = parts

  let text: string
  if (format === 'iso') {
    text = month
      ? day
        ? `${year}-${pad(month)}-${pad(day)}`
        : `${year}-${pad(month)}`
      : String(year)
    text += era
  } else if (format === 'frenchNumeric') {
    text = month
      ? day
        ? `${pad(day)}/${pad(month)}/${year}`
        : `${pad(month)}/${year}`
      : String(year)
    text += era
  } else {
    const name = month ? MONTHS[format][month - 1] : undefined
    text = name ? (day ? `${day} ${name} ${year}` : `${name} ${year}`) : String(year)
    text += era
  }

  return withQualifier(text, parts.qualifier ?? null, format)
}
