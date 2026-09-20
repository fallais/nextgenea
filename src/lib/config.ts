import type { DateFormat } from './dates'
import type { SheetName } from './pdf/tile'
import type { DirectionSetting, NameSize, TitleAlign, VerticalFrom } from './tree/layout'

export interface PosterConfig {
  rootId: string | null
  generations: number
  direction: DirectionSetting
  /** Name size in mm; the card size follows from it. */
  nameSize: NameSize
  themeId: string
  /** Poster title. Empty follows the root person's name. */
  title: string
  titleAlign: TitleAlign
  /** Generation from which card text is set on its side. */
  verticalFrom: VerticalFrom
  dateFormat: DateFormat
  /** Sheet to tile the poster onto, or 'off' for a single page. */
  tileSheet: SheetName | 'off'
  /** Draw a placeholder where an ancestor is unknown. */
  showEmpty: boolean
  /** Include birth and death places on each card. */
  showPlaces: boolean
  /** Draw the marriage plate where a couple's lines meet. */
  showMarriages: boolean
}
