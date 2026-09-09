// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Type Definitions & Output Contract
// Standalone module: no coupling to the popularity engine.
// ─────────────────────────────────────────────────────────────

/** Verifiability classification for a theme. */
export type VerifiabilityFlag = "static" | "volatile" | "subjective";

/** Verdict the engine can produce (Romanian labels, per spec). */
export type Verdict = "acceptat" | "de verificat manual" | "respins";

/** Sub-signal scores, each normalized 0–100. */
export interface QuizzabilitySignals {
  /** How much substantive material exists on the topic. */
  content_depth: number;
  /** Whether the topic yields individually answerable, non-overlapping facts. */
  fact_density: number;
  /** Has this theme already proven itself as quiz material? */
  existing_trivia_coverage: number;
  /** Neither too narrow nor too broad. */
  breadth_balance: number;
  /** Facts are checkable and stable? */
  verifiability_flag: VerifiabilityFlag;
}

/** The final structured output of the quizzability engine. */
export interface QuizzabilityResult {
  /** The theme as the user typed it (Romanian). */
  theme: string;
  /** Overall quizzability score, 0–100. */
  quizzability_score: number;
  /** Human-readable verdict in Romanian. */
  verdict: Verdict;
  /** Breakdown of sub-signals. */
  signals: QuizzabilitySignals;
  /** Short explanation of the main driver behind the score (Romanian). */
  notes: string;
  /** Optional — if the theme is too narrow or broad, a better-scoped alternative (Romanian). */
  suggested_reframe?: string;
}

// ─────────────────────────────────────────────────────────────
// Raw data types returned by the API integration layer
// ─────────────────────────────────────────────────────────────

/** Parsed result from Wikipedia API for a single article. */
export interface WikipediaArticleData {
  /** Whether the article was found at all. */
  found: boolean;
  /** The canonical title of the article. */
  title: string;
  /** Which Wikipedia language edition this came from. */
  language: "ro" | "en";
  /** Total word count of the article body. */
  wordCount: number;
  /** Number of sections/subheadings in the article. */
  sectionCount: number;
  /** List of section titles (useful for breadth analysis). */
  sectionTitles: string[];
  /** Number of categories the article belongs to. */
  categoryCount: number;
  /** Number of "See also" / linked articles. */
  seeAlsoCount: number;
  /** Number of links in the article (internal wiki-links). */
  linkCount: number;
  /** Whether this is a disambiguation page. */
  isDisambiguation: boolean;
  /** Number of entries if it IS a disambiguation page. */
  disambiguationEntries: number;
  /** Raw extract text (first ~5000 chars) for fact-density analysis. */
  extractText: string;
  /** Whether we fell back from Romanian to English Wikipedia. */
  isFallback: boolean;
}

/** Result from trivia database lookups. */
export interface TriviaSearchResult {
  /** Total number of existing trivia questions found for this theme. */
  questionCount: number;
  /** Number of distinct (non-duplicate) questions. */
  distinctQuestionCount: number;
  /** Source database name (e.g. "OpenTDB"). */
  source: string;
  /** Whether this is a Romanian-language source. */
  isRomanianSource: boolean;
}

/** Configurable weights for sub-signal aggregation. */
export interface QuizzabilityWeights {
  content_depth: number;
  fact_density: number;
  existing_trivia_coverage: number;
  breadth_balance: number;
}
