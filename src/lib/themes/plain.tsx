/**
 * Black & white — no ground, no ornament, no tints.
 *
 * Deliberately the plainest thing the renderer can draw: hairline rules on
 * white, one typeface, and no decorative layer at all. It photocopies, faxes
 * and prints on a monochrome laser without surprises, and it is the theme to
 * reach for when the chart itself is the only thing that should be looked at.
 */
import { IBM_PLEX_SANS } from './fonts'
import type { Theme } from './types'

const INK = '#000000'
const PAPER = '#FFFFFF'

export const plain: Theme = {
  id: 'plain',
  name: 'Black & white',

  fonts: { display: IBM_PLEX_SANS, body: IBM_PLEX_SANS },

  palette: {
    paper: PAPER,
    ink: INK,
    inkMuted: '#444444',
    accent: INK,

    nodeFill: PAPER,
    nodeStroke: INK,
    nodeInk: INK,

    rootFill: INK,
    rootStroke: INK,
    rootInk: PAPER,

    emptyFill: 'none',
    emptyStroke: '#9A9A9A',
    emptyInk: '#9A9A9A',

    connector: INK,
    titleInk: INK,

    plaqueFill: PAPER,
    plaqueStroke: INK,
    plaqueInk: INK,
  },

  page: { marginScale: 4.6, hairline: 0.15 },

  node: {
    radius: 0,
    strokeWidth: 0.2,
    emptyDash: '1 1',
    surnameCase: 'upper',
    surnameTracking: 0.06,
  },

  connector: {
    style: 'elbow',
    strokeWidth: 0.2,
    opacity: 1,
    cornerRadius: 0,
    junctionRadius: 0,
    mutedOpacity: 0.45,
  },

  // Nothing at all: the poster's own paper rect is the whole background.
  background: {},
}
