/**
 * Build-time font pipeline (Node only, no Python).
 *
 * Downloads the TTF sources for the faces used by the poster themes from Google
 * Fonts, subsets them to a Latin genealogical charset, and writes them to
 * public/fonts/. Those TTFs serve double duty at runtime:
 *
 *   - the browser loads them via @font-face for the on-screen preview
 *   - the PDF exporter fetches the same bytes and embeds them into the PDF
 *
 * Same bytes on both sides is what keeps preview and print identical.
 *
 * Run with: npm run fonts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import subsetFont from 'subset-font'

const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/fonts',
)

/** Faces required by the themes in src/lib/themes. */
const FACES = [
  { file: 'EBGaramond-Regular', family: 'EB Garamond', weight: 400 },
  { file: 'EBGaramond-SemiBold', family: 'EB Garamond', weight: 600 },
  { file: 'IBMPlexSans-Regular', family: 'IBM Plex Sans', weight: 400 },
  { file: 'IBMPlexSans-SemiBold', family: 'IBM Plex Sans', weight: 600 },
  { file: 'IBMPlexMono-Regular', family: 'IBM Plex Mono', weight: 400 },
  { file: 'Cormorant-Regular', family: 'Cormorant Garamond', weight: 400 },
  { file: 'Cormorant-SemiBold', family: 'Cormorant Garamond', weight: 600 },
  { file: 'Karla-Regular', family: 'Karla', weight: 400 },
  { file: 'Karla-Bold', family: 'Karla', weight: 700 },
]

/**
 * Latin charset wide enough for European genealogical records: ASCII, Latin-1
 * Supplement, Latin Extended-A and -B, plus the punctuation the poster draws.
 */
function buildCharset() {
  const chars = []
  const ranges = [
    [0x20, 0x7e], // ASCII
    [0xa0, 0x24f], // Latin-1 Supplement + Latin Extended-A + Latin Extended-B
    [0x2018, 0x201f], // curly quotes
    [0x2010, 0x2015], // hyphens and dashes
  ]
  for (const [from, to] of ranges) {
    for (let cp = from; cp <= to; cp++) chars.push(String.fromCodePoint(cp))
  }
  chars.push(...['…', '†', '‡', '•', '·', '×', '°', '€', '№', '⁂', '✳'])
  return chars.join('')
}

/** Ask the Google Fonts CSS API for TTF sources by presenting a legacy UA. */
async function resolveTtfUrls(family, weights) {
  const spec = `${family.replace(/ /g, '+')}:wght@${weights.join(';')}`
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${spec}`, {
    headers: { 'User-Agent': 'Mozilla/4.0' },
  })
  if (!res.ok) throw new Error(`Google Fonts CSS failed for ${family}: ${res.status}`)
  const css = await res.text()

  const byWeight = new Map()
  const blocks = css.split('@font-face').slice(1)
  for (const block of blocks) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1])
    const url = block.match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (weight && url && !byWeight.has(weight)) byWeight.set(weight, url)
  }
  return byWeight
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const charset = buildCharset()

  // Group faces by family so each family costs one CSS request.
  const families = new Map()
  for (const face of FACES) {
    if (!families.has(face.family)) families.set(face.family, [])
    families.get(face.family).push(face)
  }

  const manifest = []
  for (const [family, faces] of families) {
    const urls = await resolveTtfUrls(
      family,
      faces.map((f) => f.weight),
    )
    for (const face of faces) {
      const url = urls.get(face.weight)
      if (!url) throw new Error(`No TTF for ${family} ${face.weight}`)

      const source = Buffer.from(await (await fetch(url)).arrayBuffer())
      const subset = await subsetFont(source, charset, { targetFormat: 'sfnt' })
      const outFile = `${face.file}.ttf`
      await writeFile(path.join(OUT_DIR, outFile), subset)

      manifest.push({ ...face, file: outFile, bytes: subset.length })
      const kb = (n) => `${(n / 1024).toFixed(0)}kB`
      console.log(
        `${outFile.padEnd(26)} ${kb(source.length).padStart(7)} -> ${kb(subset.length).padStart(6)}`,
      )
    }
  }

  const total = manifest.reduce((sum, f) => sum + f.bytes, 0)
  console.log(`\n${manifest.length} faces, ${(total / 1024).toFixed(0)}kB total`)
}

await main()
