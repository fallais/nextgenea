import type { DateFormat } from './dates'
import type { DirectionSetting, TitleAlign, TypeScale, VerticalFrom } from './tree/layout'

export interface PosterConfig {
  rootId: string | null
  generations: number
  direction: DirectionSetting
  typeScale: TypeScale
  themeId: string
  /** Poster title. Empty follows the root person's name. */
  title: string
  titleAlign: TitleAlign
  /** Generation from which card text is set on its side. */
  verticalFrom: VerticalFrom
  dateFormat: DateFormat
  /** Draw a placeholder where an ancestor is unknown. */
  showEmpty: boolean
  /** Include birth and death places on each card. */
  showPlaces: boolean
  /** Draw the marriage plate where a couple's lines meet. */
  showMarriages: boolean
}
