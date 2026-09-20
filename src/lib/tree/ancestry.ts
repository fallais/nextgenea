/**
 * Ancestor pedigree as a perfect binary tree, addressed by Ahnentafel number:
 * the root is 1, and the father and mother of person `n` are `2n` and `2n+1`.
 * Every generation is therefore complete — missing ancestors are real slots
 * holding `null`, which is what lets the poster draw them as placeholders
 * rather than leaving holes in the layout.
 */
import type { Person } from '@/lib/gedcom/types'

export const MIN_GENERATIONS = 2
export const MAX_GENERATIONS = 12

export interface AncestorSlot {
  /** Ahnentafel number: 1 = root, 2n = father of n, 2n+1 = mother of n. */
  ahnentafel: number
  /** 0 for the root, increasing towards the oldest generation. */
  generation: number
  /** Position within the generation, 0 .. 2^generation - 1. */
  index: number
  person: Person | null
}

export interface Ancestry {
  slots: AncestorSlot[]
  generations: number
  /** Slots that resolved to a real person. */
  filled: number
  /** Total slots in the perfect tree, i.e. 2^generations - 1. */
  total: number
}

export function buildAncestry(
  byId: Map<string, Person>,
  rootId: string,
  generations: number,
): Ancestry {
  const total = 2 ** generations
  /** Ahnentafel-indexed person ids; index 0 is unused. */
  const ids = new Array<string | null>(total).fill(null)
  ids[1] = rootId

  const slots: AncestorSlot[] = []
  let filled = 0

  for (let generation = 0; generation < generations; generation++) {
    const width = 2 ** generation
    for (let index = 0; index < width; index++) {
      const ahnentafel = width + index
      const id = ids[ahnentafel]
      const person = id ? (byId.get(id) ?? null) : null
      if (person) filled++

      slots.push({ ahnentafel, generation, index, person })

      // Seed the parent slots for the next generation. Bounded by `generations`,
      // so a malformed file where someone is their own ancestor still terminates.
      if (person && generation < generations - 1) {
        ids[ahnentafel * 2] = person.fatherId
        ids[ahnentafel * 2 + 1] = person.motherId
      }
    }
  }

  return { slots, generations, filled, total: total - 1 }
}

/**
 * Pick the person with the deepest recorded ancestry — the most rewarding
 * default root.
 *
 * Memoised across the whole file: asking `reachableDepth` about every person
 * would re-walk each subtree once per descendant, which at twelve generations
 * means thousands of repeated lookups per person. This resolves each person
 * once instead.
 */
export function deepestRoot(byId: Map<string, Person>): string | null {
  const depth = new Map<string, number>()
  const onPath = new Set<string>()

  const resolve = (id: string): number => {
    const cached = depth.get(id)
    if (cached != null) return cached
    const person = byId.get(id)
    if (!person) return 0
    // A malformed file can make someone their own ancestor; stop rather than spin.
    if (onPath.has(id)) return 1

    onPath.add(id)
    const parents = [person.fatherId, person.motherId].filter((p) => p != null)
    const result = 1 + Math.max(0, ...parents.map(resolve))
    onPath.delete(id)

    depth.set(id, result)
    return result
  }

  let best: string | null = null
  let bestDepth = -1
  for (const id of byId.keys()) {
    const d = resolve(id)
    if (d > bestDepth) {
      bestDepth = d
      best = id
    }
  }
  return best
}

/**
 * How many generations are actually reachable from a person. Used for the
 * "N generations known" hint on the selected root.
 */
export function reachableDepth(
  byId: Map<string, Person>,
  rootId: string,
  cap = MAX_GENERATIONS,
): number {
  let frontier = [rootId]
  let depth = 0

  while (frontier.length && depth < cap) {
    depth++
    const next: string[] = []
    for (const id of frontier) {
      const person = byId.get(id)
      if (!person) continue
      if (person.fatherId) next.push(person.fatherId)
      if (person.motherId) next.push(person.motherId)
    }
    frontier = next
  }

  return depth
}
