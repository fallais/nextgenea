/**
 * Generates a sample GEDCOM for development.
 *
 * Ancestors only — this app draws direct ascendance, so the file carries no
 * siblings, no children beyond the line, and no spouses except the ancestral
 * couples themselves. The shape aims to be realistic rather than tidy: the
 * first few generations are complete, the middle is where most of the research
 * sits, and the deepest lines thin out to a handful of branches.
 *
 * Run with: node scripts/make-sample-gedcom.mjs [generations] > sample.ged
 */

const SURNAMES = [
  'Lefebvre', 'Moreau', 'Dubois', 'Fontaine', 'Rousseau', 'Chevalier', 'Bonnet',
  'Garnier', 'Mercier', 'Aubert', 'Delacroix', 'Vasseur', 'Marchand', 'Perrin',
  'Léonard', 'Thibault', 'Barbier', 'Guillaume', 'Renaud', 'Colin', 'Dumont',
  'Roussel', 'Lemoine', 'Girard', 'Bertrand', 'Faure', 'Clément', 'Gauthier',
  'Noguera', 'Salvador', 'Estévez', 'Carvalho', 'Ó Braonáin', 'Ó Súilleabháin',
  'Mac Cárthaigh', 'Ní Dhomhnaill', 'Świątek', 'Kowalczyk', 'Wiśniewski',
  'Zieliński', 'Weiß', 'Schäfer', 'Königsberg', 'Brandt', 'Hofmann', 'Vogel',
  'Nyström', 'Sørensen', 'Lindqvist', 'Haugen', 'Novák', 'Dvořák', 'Horváth',
  'Máthé', 'Bellini', 'Roccatagliata', 'Lombardi', 'Anselmi', 'Van Damme',
  'De Smet', 'Vandenberghe', 'Beaumont', 'Aldington', 'Fairweather',
]

const MALE = [
  'Étienne', 'Auguste', 'Henri', 'Léon', 'Camille', 'Gaspard', 'Émile', 'Victor',
  'Anatole', 'Théodore', 'Bastien', 'Aurélien', 'Corentin', 'Maxime', 'Ambroise',
  'Barthélemy', 'Clovis', 'Désiré', 'Edmond', 'Fulbert', 'Gustave', 'Hippolyte',
  'Isidore', 'Jourdain', 'Lucien', 'Marceau', 'Norbert', 'Octave', 'Prosper',
  'Quentin', 'Raoul', 'Séverin', 'Thibaud', 'Urbain', 'Valentin', 'Xavier',
  'Casimir', 'Fiachra', 'Lorcán', 'Wojciech', 'Krzysztof', 'Jürgen', 'Matthias',
]

const FEMALE = [
  'Adélaïde', 'Joséphine', 'Marguerite', 'Célestine', 'Eugénie', 'Hortense',
  'Blanche', 'Amélie', 'Rosalie', 'Léontine', 'Perrine', 'Sidonie', 'Anaïs',
  'Bérénice', 'Clémence', 'Delphine', 'Eulalie', 'Félicité', 'Geneviève',
  'Henriette', 'Isaure', 'Jacqueline', 'Léonie', 'Mathilde', 'Noémie', 'Ombeline',
  'Philomène', 'Reine', 'Solange', 'Thérèse', 'Victorine', 'Yvonne', 'Zélie',
  'Aoife', 'Sorcha', 'Bronisława', 'Jadwiga', 'Ingeborg', 'Wilhelmine', 'Ottilie',
]

const PLACES = [
  'Rouen, Seine-Maritime, France', 'Lyon, Rhône, France',
  'Bayeux, Calvados, France', 'Colmar, Haut-Rhin, France',
  'Quimper, Finistère, France', 'Albi, Tarn, France',
  'Bruges, West Flanders, Belgium', 'Namur, Wallonia, Belgium',
  'Trieste, Friuli-Venezia Giulia, Italy', 'Lucca, Tuscany, Italy',
  'Kraków, Lesser Poland, Poland', 'Gdańsk, Pomerania, Poland',
  'Galway, Connacht, Ireland', 'Skibbereen, County Cork, Ireland',
  'Freiburg, Baden-Württemberg, Germany', 'Lübeck, Schleswig-Holstein, Germany',
  'Uppsala, Uppland, Sweden', 'Bergen, Vestland, Norway',
  'Olomouc, Moravia, Czechia', 'Sopron, Győr-Moson-Sopron, Hungary',
  'Coimbra, Centro, Portugal', 'Girona, Catalonia, Spain',
  'Leiden, South Holland, Netherlands', 'Berwick-upon-Tweed, Northumberland, England',
]

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/**
 * Deterministic PRNG (mulberry32) so the sample file is stable between runs.
 * A textbook LCG is wrong here: `seed * 1103515245` overflows 2^53 in double
 * precision, so its low bits are rounding noise and the branch pruning came out
 * visibly skewed. Math.imul keeps the arithmetic exact at 32 bits.
 */
let seed = 20260907
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(rnd() * list.length)]

/** Depth to generate; pass as an argument, e.g. `node scripts/... 12`. */
const GENERATIONS = Math.min(14, Math.max(2, Number(process.argv[2]) || 10))

const lines = []
const families = []

/** Ahnentafel-indexed individuals; index 0 unused. */
const people = new Array(2 ** GENERATIONS).fill(null)

for (let n = 1; n < 2 ** GENERATIONS; n++) {
  const generation = Math.floor(Math.log2(n))

  if (n > 1) {
    const child = people[Math.floor(n / 2)]
    if (!child) continue
    // The first five generations are complete; past that, lines are lost at a
    // rising rate, which is what a real pedigree looks like.
    if (generation >= 5 && rnd() < (generation - 4) * 0.11) continue
  }

  const isMale = n === 1 ? rnd() < 0.5 : n % 2 === 0
  const gap = 26 + Math.floor(rnd() * 8)
  const birthYear = Math.round(1962 - generation * gap + (rnd() * 7 - 3))
  const deathYear = birthYear + 52 + Math.floor(rnd() * 34)

  people[n] = {
    id: `I${n}`,
    given: isMale ? pick(MALE) : pick(FEMALE),
    // Women keep a maiden name; the paternal line carries the father's surname.
    surname: isMale && n > 1 ? people[Math.floor(n / 2)].surname : pick(SURNAMES),
    sex: isMale ? 'M' : 'F',
    birthYear,
    deathYear: deathYear < 2026 ? deathYear : null,
    birthPlace: pick(PLACES),
    deathPlace: rnd() < 0.72 ? pick(PLACES) : null,
    generation,
  }
}

// The root inherits its father's surname when there is one.
if (people[2]) people[1].surname = people[2].surname

for (let n = 1; n < 2 ** GENERATIONS; n++) {
  const person = people[n]
  if (!person) continue
  const father = people[n * 2]
  const mother = people[n * 2 + 1]
  if (father || mother) {
    families.push({ id: `F${n}`, husband: father?.id, wife: mother?.id, child: person.id })
  }
}

// Index the families so the record pass stays linear rather than quadratic.
const personById = new Map(people.filter(Boolean).map((p) => [p.id, p]))
const familyAsChild = new Map(families.map((f) => [f.child, f]))
const familyAsSpouse = new Map()
for (const family of families) {
  for (const partner of [family.husband, family.wife]) {
    if (partner && !familyAsSpouse.has(partner)) familyAsSpouse.set(partner, family)
  }
}

const dateLine = (year) => {
  const roll = rnd()
  if (roll < 0.55) return `${1 + Math.floor(rnd() * 28)} ${pick(MONTHS)} ${year}`
  if (roll < 0.85) return `${year}`
  return `ABT ${year}`
}

lines.push(
  '0 HEAD', '1 SOUR NEXTGENEA-SAMPLE', '1 GEDC', '2 VERS 5.5.1',
  '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8',
)

for (let n = 1; n < 2 ** GENERATIONS; n++) {
  const person = people[n]
  if (!person) continue

  lines.push(`0 @${person.id}@ INDI`)
  lines.push(`1 NAME ${person.given} /${person.surname}/`)
  lines.push(`2 GIVN ${person.given}`, `2 SURN ${person.surname}`)
  lines.push(`1 SEX ${person.sex}`)
  lines.push('1 BIRT', `2 DATE ${dateLine(person.birthYear)}`, `2 PLAC ${person.birthPlace}`)
  if (person.deathYear) {
    lines.push('1 DEAT', `2 DATE ${dateLine(person.deathYear)}`)
    if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`)
  }

  const asChild = familyAsChild.get(person.id)
  if (asChild) lines.push(`1 FAMC @${asChild.id}@`)
  const asSpouse = familyAsSpouse.get(person.id)
  if (asSpouse) lines.push(`1 FAMS @${asSpouse.id}@`)
}

for (const family of families) {
  lines.push(`0 @${family.id}@ FAM`)
  if (family.husband) lines.push(`1 HUSB @${family.husband}@`)
  if (family.wife) lines.push(`1 WIFE @${family.wife}@`)
  lines.push(`1 CHIL @${family.child}@`)

  // Most couples have a recorded marriage; some deliberately do not.
  const child = personById.get(family.child)
  if (child && rnd() < 0.82) {
    lines.push('1 MARR', `2 DATE ${dateLine(child.birthYear - 1 - Math.floor(rnd() * 9))}`)
    if (rnd() < 0.88) lines.push(`2 PLAC ${pick(PLACES)}`)
  }
}

lines.push('0 TRLR')
process.stdout.write(lines.join('\n') + '\n')
