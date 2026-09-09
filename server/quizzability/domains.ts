// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Domain Recognition
// Recognizes academic/knowledge domains from theme strings to
// provide a reliable baseline signal independent of external APIs.
//
// This is NOT hardcoding quiz scores — it's classifying themes
// into domain categories (which is objectively factual) and
// setting minimum scoring floors based on that classification.
// "Matematică" IS a broad academic domain. That's a fact.
// ─────────────────────────────────────────────────────────────

/** Result of domain recognition for a theme. */
export interface DomainRecognition {
  /** Whether a known domain was detected in the theme. */
  recognized: boolean;
  /**
   * Classification tier:
   * 1 = broad umbrella domain (e.g. "matematică", "istorie")
   * 2 = well-known sub-field (e.g. "istoria Europei", "chimia organică")
   * 3 = domain keyword present with narrow/unknown qualifier
   * 0 = no domain recognized
   */
  tier: 0 | 1 | 2 | 3;
  /** Internal domain key (e.g. "history", "mathematics"). */
  domainKey: string;
  /** Minimum score floor for this domain tier. */
  floorScore: number;
  /** Additional points added on top of the API-derived score. */
  boostScore: number;
}

// ─────────────────────────────────────────────────────────────
// Domain stem map
// ─────────────────────────────────────────────────────────────
// Maps the first N characters of a normalized (lowercase, no diacritics)
// word to an internal domain key. Handles all Romanian grammatical forms
// (nominative, articulated, genitive) automatically via prefix matching.
//
// Sorted longest-first so "cinematograf" matches before "cinema" etc.

const DOMAIN_STEMS: [string, string][] = [
  // Sciences
  ["matemat", "mathematics"],
  ["fizic", "physics"],
  ["chimi", "chemistry"],
  ["biolog", "biology"],
  ["astronom", "astronomy"],
  ["informatic", "computer_science"],
  ["medicin", "medicine"],
  ["geolog", "geology"],
  ["ecolog", "ecology"],
  ["zoolog", "zoology"],
  ["botanic", "botany"],
  ["anatom", "anatomy"],
  ["fiziolog", "physiology"],
  ["genetic", "genetics"],
  ["paleontolog", "paleontology"],
  ["farmac", "pharmacy"],
  ["stiint", "science"],
  ["trigonomet", "mathematics"],
  ["algebr", "mathematics"],
  ["geometr", "mathematics"],
  ["calcul", "mathematics"],
  // Humanities
  ["istor", "history"],
  ["geograf", "geography"],
  ["literat", "literature"],
  ["filosof", "philosophy"],
  ["lingvistic", "linguistics"],
  ["arheolog", "archaeology"],
  ["teolog", "theology"],
  // Arts
  ["cinematograf", "cinema"],
  ["fotograf", "photography"],
  ["coreo", "choreography"],
  ["muzic", "music"],
  ["teatr", "theater"],
  ["sculpt", "sculpture"],
  ["pictur", "painting"],
  ["arhitectur", "architecture"],
  // Social sciences
  ["econom", "economics"],
  ["politic", "politics"],
  ["psiholog", "psychology"],
  ["sociolog", "sociology"],
  ["antropolog", "anthropology"],
  ["pedagog", "pedagogy"],
  ["demograf", "demographics"],
  // Other broad domains
  ["religi", "religion"],
  ["mitolog", "mythology"],
  ["gastronom", "gastronomy"],
  ["tehnolog", "technology"],
  ["culinar", "gastronomy"],
  // English equivalents (for fallback)
  ["histor", "history"],
  ["mathemat", "mathematics"],
  ["chemist", "chemistry"],
  ["geograph", "geography"],
  ["philosoph", "philosophy"],
  ["mytholog", "mythology"],
  ["psycholog", "psychology"],
  ["sociolog", "sociology"],
  ["technolog", "technology"],
  ["econom", "economics"],
  ["biolog", "biology"],
  ["physic", "physics"],
  ["astrono", "astronomy"],
  ["computer", "computer_science"],
  ["literat", "literature"],
];

// Short-word exact matches for domains whose stems are too short
// for reliable prefix matching (would cause false positives).
const SHORT_DOMAIN_WORDS: Record<string, string> = {
  // Romanian
  "arta": "art",
  "arte": "art",
  "artele": "art",
  "artei": "art",
  "sport": "sports",
  "sportul": "sports",
  "sporturi": "sports",
  "sporturilor": "sports",
  "drept": "law",
  "dreptul": "law",
  "dreptului": "law",
  "dans": "dance",
  "dansul": "dance",
  "dansului": "dance",
  "film": "cinema",
  "filme": "cinema",
  "filmul": "cinema",
  "filmului": "cinema",
  "opera": "opera",
  "operei": "opera",
  "muzica": "music",
  // English
  "art": "art",
  "arts": "art",
  "music": "music",
  "law": "law",
  "dance": "dance",
  "cinema": "cinema",
  "sports": "sports",
  "science": "science",
  "history": "history",
  "math": "mathematics",
  "maths": "mathematics",
};

// ─────────────────────────────────────────────────────────────
// Qualifier prominence map
// ─────────────────────────────────────────────────────────────
// Qualifier stems that indicate well-known sub-fields (tier 2 instead of 3).
// These are regions, periods, or concepts that are broadly known and
// highly relevant for a Romanian trivia audience.

const PROMINENT_QUALIFIER_STEMS = [
  // Geographic — Romania-centric & European
  "europ", "roman", "transil", "moldo", "balcan", "mediteran",
  "carpat", "dunare", "pontic",
  // Geographic — world-scale
  "lum", "mondial", "universal", "global", "international",
  // Temporal periods
  "antic", "clasic", "medieva", "renast", "baroc", "iluminis",
  "modern", "contemporan", "premodern", "preistor",
  // Civilizations well-known in Romanian education
  "grec", "egipt", "persian", "otoman", "bizant", "dacic",
  // Scope descriptors
  "general", "comparat", "teoretica", "aplicat", "fundamental",
  // Well-known sub-fields
  "organic", "anorganic", "nuclear", "cuantic", "relativ",
  "olimpic", "solar", "uman", "corpul",
];

// ─────────────────────────────────────────────────────────────
// Tier score parameters
// ─────────────────────────────────────────────────────────────

const TIER_SCORES = {
  tier1: { floor: 82, boost: 8 },
  tier2: { floor: 62, boost: 5 },
  tier3: { floor: 0, boost: 5 },
} as const;

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Normalize a theme string for domain matching:
 * lowercase, strip diacritics, collapse whitespace.
 */
function normalizeDomain(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Recognize whether a theme string matches a known academic/knowledge domain.
 *
 * Returns a `DomainRecognition` with tier classification and scoring params.
 * - Tier 1: theme IS a broad domain ("matematică") → floor 82, boost 8
 * - Tier 2: theme is a well-known sub-field ("istoria Europei") → floor 62, boost 5
 * - Tier 3: theme has a domain keyword but niche qualifier → no floor, boost 5
 * - Tier 0: no domain recognized → no floor, no boost
 */
export function recognizeDomain(theme: string): DomainRecognition {
  const normalized = normalizeDomain(theme);
  const words = normalized.split(" ");

  const unrecognized: DomainRecognition = {
    recognized: false,
    tier: 0,
    domainKey: "",
    floorScore: 0,
    boostScore: 0,
  };

  // ── Find domain match ──
  let matchedDomainKey = "";
  let matchedWordIndex = -1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check stem matches (for words long enough to avoid false positives)
    if (word.length >= 4) {
      for (const [stem, domainKey] of DOMAIN_STEMS) {
        if (word.startsWith(stem)) {
          matchedDomainKey = domainKey;
          matchedWordIndex = i;
          break;
        }
      }
    }

    // Check exact word matches (for short words like "art", "sport")
    if (!matchedDomainKey && SHORT_DOMAIN_WORDS[word]) {
      matchedDomainKey = SHORT_DOMAIN_WORDS[word];
      matchedWordIndex = i;
    }

    if (matchedDomainKey) break;
  }

  if (!matchedDomainKey) return unrecognized;

  // ── Determine tier based on qualifiers ──
  const particles = new Set([
    "de", "la", "al", "a", "in", "din", "lui", "si", "cu",
    "pe", "sub", "the", "of", "and", "for", "on",
  ]);
  const qualifierWords = words
    .filter((_, i) => i !== matchedWordIndex)
    .filter((w) => w.length > 2 && !particles.has(w));

  const hasQualifier = qualifierWords.length > 0;

  if (!hasQualifier) {
    // Theme IS just the domain keyword → tier 1 (broadest umbrella)
    return {
      recognized: true,
      tier: 1,
      domainKey: matchedDomainKey,
      floorScore: TIER_SCORES.tier1.floor,
      boostScore: TIER_SCORES.tier1.boost,
    };
  }

  // Theme has qualifier(s) — check if they're prominent
  const qualifierText = qualifierWords.join(" ");
  const isProminent = PROMINENT_QUALIFIER_STEMS.some((stem) =>
    qualifierText.includes(stem)
  );

  if (isProminent) {
    // Well-known sub-field → tier 2
    return {
      recognized: true,
      tier: 2,
      domainKey: matchedDomainKey,
      floorScore: TIER_SCORES.tier2.floor,
      boostScore: TIER_SCORES.tier2.boost,
    };
  }

  // Unknown/niche qualifier → tier 3 (no floor, small boost)
  return {
    recognized: true,
    tier: 3,
    domainKey: matchedDomainKey,
    floorScore: TIER_SCORES.tier3.floor,
    boostScore: TIER_SCORES.tier3.boost,
  };
}
