// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Signal Computation
// Computes each of the 5 sub-signals from raw API data.
// Now umbrella-aware: broad domains use subtree aggregation,
// leaf topics use single-article scoring.
// ─────────────────────────────────────────────────────────────

import type {
  WikipediaArticleData,
  WikipediaCategoryData,
  TriviaSearchResult,
  VerifiabilityFlag,
  TopicType,
} from "./types.js";
import {
  CONTENT_DEPTH_PARAMS,
  UMBRELLA_DEPTH_PARAMS,
  FACT_DENSITY_PARAMS,
  BREADTH_PARAMS,
  TRIVIA_PARAMS,
  VERIFIABILITY_PATTERNS,
  CATEGORY_PARAMS,
} from "./config.js";

/** Clamp a value to [0, 100]. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Linear interpolation: maps `value` in [min, max] to [0, 100]. */
function lerp(value: number, min: number, max: number): number {
  if (max <= min) return value >= min ? 100 : 0;
  return clamp(((value - min) / (max - min)) * 100);
}

// ─────────────────────────────────────────────────────────────
// 1. CONTENT DEPTH (0–100)
// ─────────────────────────────────────────────────────────────

/**
 * Compute content depth, branching on topic type.
 * - Umbrella themes: depth is dominated by the category subtree
 *   (total articles, subcategories, branch richness), NOT the
 *   single overview article's word count.
 * - Leaf themes: depth comes from the single article as before.
 */
export function computeContentDepth(
  wiki: WikipediaArticleData,
  topicType: TopicType,
  categoryData?: WikipediaCategoryData
): number {
  if (topicType === "umbrella" && categoryData?.found) {
    return computeUmbrellaContentDepth(categoryData, wiki);
  }
  return computeLeafContentDepth(wiki);
}

/** Content depth for umbrella/domain themes (subtree-based). */
function computeUmbrellaContentDepth(
  cat: WikipediaCategoryData,
  wiki: WikipediaArticleData
): number {
  const p = UMBRELLA_DEPTH_PARAMS;

  // Sub-component: how many articles exist in the subtree (0–100)
  const articleScore = lerp(cat.totalArticles, 0, p.maxArticleCount);

  // Sub-component: how many subcategories (distinct quiz angles) (0–100)
  const subcatScore = lerp(cat.totalSubcategories, 0, p.maxSubcategoryCount);

  // Sub-component: average content richness of sampled subtree articles (0–100)
  const richnessScore = lerp(cat.avgBranchRichness, 0, p.maxBranchRichness);

  const subtreeScore =
    articleScore * p.articleCountWeight +
    subcatScore * p.subcategoryCountWeight +
    richnessScore * p.branchRichnessWeight;

  // The overview article's own content adds a small bonus (up to 10 points)
  // but never drags the score down — the subtree dominates.
  let articleBonus = 0;
  if (wiki.found && !wiki.isDisambiguation) {
    articleBonus = Math.min(10, lerp(wiki.wordCount, 0, 5000) * 0.1);
  }

  return clamp(subtreeScore + articleBonus);
}

/** Content depth for leaf/specific themes (single-article-based). */
function computeLeafContentDepth(wiki: WikipediaArticleData): number {
  if (!wiki.found) return 0;

  const p = CONTENT_DEPTH_PARAMS;

  const wordScore = lerp(wiki.wordCount, p.minWordCount, p.maxWordCount);
  const sectionScore = lerp(wiki.sectionCount, 0, p.maxSections);
  const relatedCount = wiki.categoryCount + wiki.seeAlsoCount;
  const relatedScore = lerp(relatedCount, 0, p.maxRelatedLinks);

  const raw =
    wordScore * p.wordCountWeight +
    sectionScore * p.sectionWeight +
    relatedScore * p.relatedLinksWeight;

  if (wiki.isDisambiguation) {
    return clamp(raw * 0.4);
  }

  return clamp(raw);
}

// ─────────────────────────────────────────────────────────────
// 2. FACT DENSITY / DISTINCTNESS (0–100)
// ─────────────────────────────────────────────────────────────

/**
 * Compute fact density, branching on topic type.
 * - Umbrella themes: the overview article is an outline — low fact
 *   density there does NOT mean the domain lacks facts. Use the
 *   subtree's article count and richness as a proxy instead.
 * - Leaf themes: analyze the single article's text for discrete facts.
 */
export function computeFactDensity(
  wiki: WikipediaArticleData,
  topicType: TopicType,
  categoryData?: WikipediaCategoryData
): number {
  if (topicType === "umbrella" && categoryData?.found) {
    return computeUmbrellaFactDensity(categoryData, wiki);
  }
  return computeLeafFactDensity(wiki);
}

/**
 * Fact density for umbrella themes.
 * A domain with 2,000 descendant articles clearly has massive fact
 * density — we don't need to parse the overview article's text.
 * Score is derived from subtree size × branch richness.
 */
function computeUmbrellaFactDensity(
  cat: WikipediaCategoryData,
  wiki: WikipediaArticleData
): number {
  // If the subtree is large and branches are rich, fact density is high.
  // A tree of 2000 articles with average 2000-word articles = enormous fact pool.
  const subtreeFactProxy =
    Math.min(cat.totalArticles, 2000) * Math.min(cat.avgBranchRichness, 3000);

  // Normalize: 2000 articles × 1500 avg words = 3,000,000 → maps to 100
  const normalizedScore = lerp(subtreeFactProxy, 0, 3_000_000);

  // Still add a small contribution from the overview article's own facts
  // (umbrella articles often have useful fact-dense sections like timelines)
  let articleContribution = 0;
  if (wiki.found && wiki.extractText.length > 0) {
    articleContribution = computeLeafFactDensity(wiki) * 0.15; // 15% weight
  }

  return clamp(normalizedScore * 0.85 + articleContribution);
}

/** Fact density for leaf/specific themes (text analysis of single article). */
function computeLeafFactDensity(wiki: WikipediaArticleData): number {
  if (!wiki.found || wiki.extractText.length === 0) return 0;

  const text = wiki.extractText;
  const p = FACT_DENSITY_PARAMS;

  // Count discrete factual claims: dates (years), numbers, capitalized named entities
  const dateMatches = text.match(p.datePattern) || [];
  const numberMatches = text.match(p.numberPattern) || [];

  // Named entities: sequences of 2+ capitalized words (rough heuristic)
  const namedEntityPattern =
    /(?:[A-ZĂÂÎȘȚ][a-zăâîșțéèêëàùûüôöïîçñ]+(?:\s+(?:de|din|al|la|și|a|în|cu))?\s+){1,}[A-ZĂÂÎȘȚ][a-zăâîșțéèêëàùûüôöïîçñ]+/g;
  const entityMatches = text.match(namedEntityPattern) || [];

  // Deduplicate
  const uniqueDates = new Set(dateMatches);
  const uniqueEntities = new Set(entityMatches.map((e) => e.trim()));

  const totalFacts =
    uniqueDates.size + uniqueEntities.size + Math.min(numberMatches.length, 30);

  // Base score from fact count
  let factScore = lerp(totalFacts, 0, p.maxFactCount);

  // ── Narrative penalty ──
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    const factfulSentences = sentences.filter((sentence) => {
      const hasDate = p.datePattern.test(sentence);
      p.datePattern.lastIndex = 0;
      const hasNumber = /\b\d+\b/.test(sentence);
      const hasEntity = /[A-ZĂÂÎȘȚ][a-zăâîșț]+/.test(sentence);
      return hasDate || hasNumber || hasEntity;
    });

    const factfulRatio = factfulSentences.length / sentences.length;

    if (factfulRatio < p.narrativePenaltyThreshold) {
      factScore *= p.narrativePenaltyFactor;
    }
  }

  if (wiki.isDisambiguation) {
    factScore *= 0.3;
  }

  return clamp(factScore);
}

// ─────────────────────────────────────────────────────────────
// 3. EXISTING TRIVIA COVERAGE (0–100)
// ─────────────────────────────────────────────────────────────

export function computeTriviaCoverage(
  triviaResults: TriviaSearchResult[]
): number {
  if (triviaResults.length === 0) return 0;

  const p = TRIVIA_PARAMS;

  let totalDistinct = 0;
  let hasRomanianSource = false;

  for (const result of triviaResults) {
    totalDistinct += result.distinctQuestionCount;
    if (result.isRomanianSource) {
      hasRomanianSource = true;
    }
  }

  let score = lerp(totalDistinct, 0, p.maxDistinctQuestions);

  if (hasRomanianSource) {
    score = Math.min(100, score * p.romanianSourceBonus);
  }

  return clamp(score);
}

// ─────────────────────────────────────────────────────────────
// 4. BREADTH BALANCE (0–100)
// ─────────────────────────────────────────────────────────────

export interface BreadthAnalysis {
  score: number;
  isTooNarrow: boolean;
  isTooBroad: boolean;
}

/**
 * Compute breadth balance, branching on topic type.
 *
 * KEY FIX: for umbrella themes, breadth is a POSITIVE signal, not
 * a penalty. A large, well-populated category tree (real breadth)
 * scores high. A large tree of mostly-empty stubs (fake breadth)
 * scores low.
 *
 * Breadth only becomes a problem when it's breadth *without* depth —
 * i.e. many subcategories that are themselves near-empty stubs.
 */
export function computeBreadthBalance(
  wiki: WikipediaArticleData,
  topicType: TopicType,
  categoryData?: WikipediaCategoryData
): BreadthAnalysis {
  if (topicType === "umbrella" && categoryData?.found) {
    return computeUmbrellaBreadth(categoryData);
  }
  return computeLeafBreadth(wiki);
}

/**
 * Breadth for umbrella themes.
 * Breadth is a positive signal here: more subcategories + well-populated
 * branches = more quiz angles. Only penalize if branches are empty stubs.
 */
function computeUmbrellaBreadth(cat: WikipediaCategoryData): BreadthAnalysis {
  // Subtree size: number of articles is the primary breadth signal
  const sizeScore = lerp(cat.totalArticles, 0, 1500);

  // Quality: average branch richness — a tree of stubs is "fake breadth"
  const qualityScore = lerp(
    cat.avgBranchRichness,
    0,
    CATEGORY_PARAMS.richBranchMinWordCount * 3
  );

  // Combined: breadth weighted by quality
  // A big tree with rich articles → high score
  // A big tree with all stubs → mediocre score
  // A small tree → low score
  const combinedScore = sizeScore * 0.6 + qualityScore * 0.4;

  return {
    score: clamp(combinedScore),
    isTooNarrow: false, // umbrella themes are never "too narrow"
    isTooBroad: false,  // breadth is positive for umbrella themes
  };
}

/** Breadth for leaf/specific themes (original single-article logic). */
function computeLeafBreadth(wiki: WikipediaArticleData): BreadthAnalysis {
  if (!wiki.found) {
    return { score: 0, isTooNarrow: true, isTooBroad: false };
  }

  const p = BREADTH_PARAMS;
  const sections = wiki.sectionCount;
  const words = wiki.wordCount;

  let isTooNarrow = false;
  let isTooBroad = false;

  // ── Too narrow? ──
  if (
    sections < p.tooNarrowThreshold ||
    words < p.tooNarrowWordCount
  ) {
    isTooNarrow = true;
    const narrowScore =
      lerp(sections, 0, p.idealSectionMin) * 0.5 +
      lerp(words, 0, p.tooNarrowWordCount) * 0.5;
    return { score: clamp(narrowScore * 0.6), isTooNarrow, isTooBroad };
  }

  // ── Too broad? ──
  // Note: this only applies to leaf topics — for umbrella themes,
  // breadth is handled by computeUmbrellaBreadth above.
  if (sections > p.tooBroadThreshold || words > p.tooBroadWordCount) {
    isTooBroad = true;
    const broadPenalty =
      sections > p.tooBroadThreshold * 2
        ? 0.4
        : 0.7;
    const baseScore = 100 * broadPenalty;
    return { score: clamp(baseScore), isTooNarrow, isTooBroad };
  }

  // ── Sweet spot ──
  let score: number;
  if (sections >= p.idealSectionMin && sections <= p.idealSectionMax) {
    const center = (p.idealSectionMin + p.idealSectionMax) / 2;
    const distFromCenter = Math.abs(sections - center);
    const maxDist = (p.idealSectionMax - p.idealSectionMin) / 2;
    score = 80 + lerp(maxDist - distFromCenter, 0, maxDist) * 0.2;
  } else if (sections > p.idealSectionMax) {
    score = lerp(
      p.tooBroadThreshold - sections,
      0,
      p.tooBroadThreshold - p.idealSectionMax
    );
    score = 50 + score * 0.3;
  } else {
    score = lerp(
      sections - p.tooNarrowThreshold,
      0,
      p.idealSectionMin - p.tooNarrowThreshold
    );
    score = 40 + score * 0.4;
  }

  return { score: clamp(score), isTooNarrow, isTooBroad };
}

// ─────────────────────────────────────────────────────────────
// 5. VERIFIABILITY FLAG
// ─────────────────────────────────────────────────────────────

export function classifyVerifiability(theme: string): VerifiabilityFlag {
  const text = theme.toLowerCase();

  for (const pattern of VERIFIABILITY_PATTERNS.subjective) {
    if (pattern.test(text)) {
      return "subjective";
    }
  }

  for (const pattern of VERIFIABILITY_PATTERNS.volatile) {
    if (pattern.test(text)) {
      return "volatile";
    }
  }

  return "static";
}
