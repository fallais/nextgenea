/**
 * Theme registry.
 *
 * Adding a theme means adding one object to this array. Nothing in the poster
 * component, the layout engine or the PDF exporter refers to a theme by name.
 */
import { archival } from './archival'
import { blueprint } from './blueprint'
import { botanical } from './botanical'
import { heraldic } from './heraldic'
import { plain } from './plain'
import type { Theme } from './types'

export const THEMES: Theme[] = [plain, archival, heraldic, blueprint, botanical]

export const DEFAULT_THEME_ID = archival.id

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export type { Theme } from './types'
