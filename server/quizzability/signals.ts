// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Signal Computation
// Computes each of the 5 sub-signals from raw API data.
// ─────────────────────────────────────────────────────────────

import type {
  WikipediaArticleData,
  TriviaSearchResult,
  VerifiabilityFlag,
} from "./types.js";
import {
  CONTENT_DEPTH_PARAMS,
  FACT_DENSITY_PARAMS,
  BREADTH_PARAMS,
  TRIVIA_PARAMS,
  VERIFIABILITY_PATTERNS,
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

export function computeContentDepth(wiki: WikipediaArticleData): number {
  if (!wiki.found) return 0;

  const p = CONTENT_DEPTH_PARAMS;

  // Sub-component: word count (0–100)
  const wordScore = lerp(wiki.wordCount, p.minWordCount, p.maxWordCount);

  // Sub-component: section richness (0–100)
  const sectionScore = lerp(wiki.sectionCount, 0, p.maxSections);

  // Sub-component: related links breadth (categories + see-also + links)
  const relatedCount = wiki.categoryCount + wiki.seeAlsoCount;
  const relatedScore = lerp(relatedCount, 0, p.maxRelatedLinks);

  const raw =
    wordScore * p.wordCountWeight +
    sectionScore * p.sectionWeight +
    relatedScore * p.relatedLinksWeight;

  // Disambiguation pages get a content_depth penalty — the "article" is
  // really a list of possibilities, not substantive content.
  if (wiki.isDisambiguation) {
    return clamp(raw * 0.4);
  }

  return clamp(raw);
}

// ─────────────────────────────────────────────────────────────
// 2. FACT DENSITY / DISTINCTNESS (0–100)
// ─────────────────────────────────────────────────────────────

export function computeFactDensity(wiki: WikipediaArticleData): number {
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
  // If the text reads as one long narrative with few distinct facts
  // per sentence, penalize it.
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    // Count sentences that contain at least one "fact marker" (date, number, entity)
    const factfulSentences = sentences.filter((sentence) => {
      const hasDate = p.datePattern.test(sentence);
      // Reset lastIndex since datePattern uses /g flag
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

  // Disambiguation pages have poor fact density (just lists)
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

  // Aggregate distinct question counts across all sources
  let totalDistinct = 0;
  let hasRomanianSource = false;

  for (const result of triviaResults) {
    totalDistinct += result.distinctQuestionCount;
    if (result.isRomanianSource) {
      hasRomanianSource = true;
    }
  }

  let score = lerp(totalDistinct, 0, p.maxDistinctQuestions);

  // Bonus for Romanian-language trivia availability
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

export function computeBreadthBalance(
  wiki: WikipediaArticleData
): BreadthAnalysis {
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
    // Still give some score — a theme with 2 sections isn't 0
    const narrowScore =
      lerp(sections, 0, p.idealSectionMin) * 0.5 +
      lerp(words, 0, p.tooNarrowWordCount) * 0.5;
    return { score: clamp(narrowScore * 0.6), isTooNarrow, isTooBroad };
  }

  // ── Too broad? ──
  if (sections > p.tooBroadThreshold || words > p.tooBroadWordCount) {
    isTooBroad = true;
    // Very broad themes can still be quizzable (e.g. "Istorie") but
    // need reframing. Give partial credit.
    const broadPenalty =
      sections > p.tooBroadThreshold * 2
        ? 0.4 // extremely broad
        : 0.7; // moderately broad
    const baseScore = 100 * broadPenalty;
    return { score: clamp(baseScore), isTooNarrow, isTooBroad };
  }

  // ── Sweet spot ──
  // Peak score when sections are in [idealSectionMin, idealSectionMax]
  let score: number;
  if (sections >= p.idealSectionMin && sections <= p.idealSectionMax) {
    // Perfect range — score based on how centered we are
    const center = (p.idealSectionMin + p.idealSectionMax) / 2;
    const distFromCenter = Math.abs(sections - center);
    const maxDist = (p.idealSectionMax - p.idealSectionMin) / 2;
    // 80–100 in the sweet spot
    score = 80 + lerp(maxDist - distFromCenter, 0, maxDist) * 0.2;
  } else if (sections > p.idealSectionMax) {
    // Between idealMax and tooBroad — gradual decrease
    score = lerp(
      p.tooBroadThreshold - sections,
      0,
      p.tooBroadThreshold - p.idealSectionMax
    );
    score = 50 + score * 0.3; // 50–80 range
  } else {
    // Between tooNarrow and idealMin
    score = lerp(
      sections - p.tooNarrowThreshold,
      0,
      p.idealSectionMin - p.tooNarrowThreshold
    );
    score = 40 + score * 0.4; // 40–80 range
  }

  return { score: clamp(score), isTooNarrow, isTooBroad };
}

// ─────────────────────────────────────────────────────────────
// 5. VERIFIABILITY FLAG
// ─────────────────────────────────────────────────────────────

export function classifyVerifiability(theme: string): VerifiabilityFlag {
  const text = theme.toLowerCase();

  // Check subjective patterns first (higher priority)
  for (const pattern of VERIFIABILITY_PATTERNS.subjective) {
    if (pattern.test(text)) {
      return "subjective";
    }
  }

  // Check volatile patterns
  for (const pattern of VERIFIABILITY_PATTERNS.volatile) {
    if (pattern.test(text)) {
      return "volatile";
    }
  }

  return "static";
}
