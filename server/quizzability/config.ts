// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Configurable Weights & Thresholds
// All weights are tunable; nothing is hardcoded in the scoring logic.
// ─────────────────────────────────────────────────────────────

import type { QuizzabilityWeights } from "./types.js";

/**
 * Default sub-signal weights (must sum to 1.0).
 * Tuned against the calibration set — see calibration.ts.
 *
 * Rationale:
 * - content_depth (0.30): strong base signal — no content, no quiz.
 * - fact_density (0.30): equally important — needs discrete answerable facts.
 * - existing_trivia_coverage (0.20): direct proof the theme works as trivia.
 * - breadth_balance (0.20): guards against too-narrow and too-broad themes.
 */
export const DEFAULT_WEIGHTS: QuizzabilityWeights = {
  content_depth: 0.30,
  fact_density: 0.30,
  existing_trivia_coverage: 0.20,
  breadth_balance: 0.20,
};

/**
 * Score thresholds for mapping the 0–100 score to a verdict.
 */
export const VERDICT_THRESHOLDS = {
  /** Score >= this → "acceptat" */
  accepted: 60,
  /** Score >= this (but < accepted) → "de verificat manual" */
  borderline: 35,
  /** Score < borderline → "respins" */
} as const;

/**
 * Content depth scoring parameters.
 */
export const CONTENT_DEPTH_PARAMS = {
  /** Word count that maps to a 100 score (articles this long or longer get 100). */
  maxWordCount: 10_000,
  /** Minimum word count below which the article is considered "stub-level". */
  minWordCount: 200,
  /** Section count at which the breadth aspect of depth maxes out. */
  maxSections: 25,
  /** Category/see-also count that maxes out breadth-of-links score. */
  maxRelatedLinks: 40,
  /** Weight of word-count component within content_depth (0–1). */
  wordCountWeight: 0.50,
  /** Weight of section-count component within content_depth (0–1). */
  sectionWeight: 0.30,
  /** Weight of related-links component within content_depth (0–1). */
  relatedLinksWeight: 0.20,
} as const;

/**
 * Fact density scoring parameters.
 */
export const FACT_DENSITY_PARAMS = {
  /** Regex patterns used to identify "discrete facts" in extract text. */
  datePattern: /\b(1[0-9]{3}|20[0-2][0-9])\b/g,
  numberPattern: /\b\d{1,3}([.,]\d{3})*([.,]\d+)?\b/g,
  /** Minimum number of named entities + dates + numbers for a 100 score. */
  maxFactCount: 80,
  /** Ratio of unique-entity sentences to total sentences — below this, penalize. */
  narrativePenaltyThreshold: 0.25,
  /** How much to penalize for narrative-heavy content (multiplier). */
  narrativePenaltyFactor: 0.6,
} as const;

/**
 * Breadth balance scoring parameters.
 */
export const BREADTH_PARAMS = {
  /** Ideal range for section count (sweet spot for quizzability). */
  idealSectionMin: 5,
  idealSectionMax: 30,
  /** Below this, too narrow. */
  tooNarrowThreshold: 3,
  /** Above this, too broad (may need reframing). */
  tooBroadThreshold: 60,
  /** Word-count threshold below which we flag "too narrow" regardless of sections. */
  tooNarrowWordCount: 500,
  /** Word-count threshold above which we consider "could be broad". */
  tooBroadWordCount: 50_000,
} as const;

/**
 * Trivia coverage scoring parameters.
 */
export const TRIVIA_PARAMS = {
  /** Number of distinct questions that maps to a 100 score. */
  maxDistinctQuestions: 20,
  /** Bonus multiplier if questions are from a Romanian source. */
  romanianSourceBonus: 1.2,
} as const;

/**
 * Keywords/patterns used for verifiability classification.
 */
export const VERIFIABILITY_PATTERNS = {
  /** Themes matching these patterns are classified as "subjective". */
  subjective: [
    /\b(cel mai bun|cea mai bun[ăa]|cele mai bune|favorit[eăa]?|opini[ei]|părere|gust)\b/i,
    /\b(best|worst|favorite|opinion|taste)\b/i,
    /\b(top\s+\d+|ranking|clasament\s+personal)\b/i,
  ],
  /** Themes matching these patterns are classified as "volatile" (fast-changing). */
  volatile: [
    /\b(actual[ăa]?|curent[ăa]?|azi|astăzi|săptămâna\s+aceasta|luna\s+aceasta|2025|2026)\b/i,
    /\b(current|today|this\s+week|this\s+month|standings|scoreboard|live)\b/i,
    /\b(clasament\s+(actual|curent)|rezultate\s+recente|ultimele\s+știri)\b/i,
    /\b(nba|nfl|premier\s+league|liga\s+1)\s+(standings|clasament|rezultate)/i,
  ],
} as const;

/**
 * Category subtree traversal parameters (for umbrella theme detection).
 */
export const CATEGORY_PARAMS = {
  /** Minimum descendant articles within the subtree to classify as "umbrella". */
  umbrellaThreshold: 50,
  /** Maximum recursion depth when traversing the category tree. */
  maxTraversalDepth: 3,
  /** Max subcategories to follow per level (prevents runaway on huge trees). */
  maxSubcategoriesPerLevel: 20,
  /** Number of random articles to sample from the subtree for richness scoring. */
  richnessSampleSize: 8,
  /** Minimum average word count per sampled article to count as "rich" content. */
  richBranchMinWordCount: 500,
} as const;

/**
 * Umbrella-specific content depth scoring parameters.
 * Used instead of the article-level CONTENT_DEPTH_PARAMS when the theme
 * is classified as an umbrella domain.
 */
export const UMBRELLA_DEPTH_PARAMS = {
  /** Subtree article count that maps to a 100 score. */
  maxArticleCount: 2000,
  /** Subtree subcategory count that maps to a 100 score. */
  maxSubcategoryCount: 100,
  /** Average branch richness (word count) that maps to a 100 score. */
  maxBranchRichness: 3000,
  /** Weight of subtree-article-count within umbrella content_depth (0–1). */
  articleCountWeight: 0.45,
  /** Weight of subcategory-count within umbrella content_depth (0–1). */
  subcategoryCountWeight: 0.25,
  /** Weight of branch-richness within umbrella content_depth (0–1). */
  branchRichnessWeight: 0.30,
} as const;

