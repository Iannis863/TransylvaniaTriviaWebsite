// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Main Orchestrator
// Takes a theme string, fetches data, detects topic type
// (umbrella vs leaf), computes signals with the right strategy,
// aggregates into a final score, and returns the JSON contract.
// ─────────────────────────────────────────────────────────────

import type {
  QuizzabilityResult,
  QuizzabilityWeights,
  Verdict,
  QuizzabilitySignals,
  WikipediaCategoryData,
  TopicType,
} from "./types.js";
import { DEFAULT_WEIGHTS, VERDICT_THRESHOLDS } from "./config.js";
import { fetchWikipediaData, fetchCategoryData, classifyTopicType } from "./wikipedia.js";
import { searchTriviaQuestions } from "./trivia.js";
import {
  computeContentDepth,
  computeFactDensity,
  computeTriviaCoverage,
  computeBreadthBalance,
  classifyVerifiability,
} from "./signals.js";

/**
 * Score the "quizzability" of a theme.
 *
 * This is a standalone scoring function — it is NOT coupled to the
 * popularity engine. The two scores can be combined or weighted
 * independently downstream.
 *
 * @param theme The theme string, expected in Romanian.
 * @param weights Optional custom weights (defaults to DEFAULT_WEIGHTS).
 * @returns A structured QuizzabilityResult.
 */
export async function scoreQuizzability(
  theme: string,
  weights: QuizzabilityWeights = DEFAULT_WEIGHTS
): Promise<QuizzabilityResult> {
  // ── Step 1: Fetch raw data from external sources (in parallel) ──
  // Fetch article data AND category data simultaneously
  const [wikiData, categoryData] = await Promise.all([
    fetchWikipediaData(theme),
    fetchCategoryData(theme),
  ]);

  // ── Step 2: Topic-type detection (umbrella vs leaf) ──
  // This runs BEFORE scoring so we can branch the scoring logic.
  const topicType = classifyTopicType(categoryData);

  // ── Step 3: Fetch trivia data ──
  // For umbrella themes, also pass subtopic names so trivia search
  // can aggregate across the domain's subtopics.
  const subtopics = topicType === "umbrella"
    ? categoryData.directSubcategoryNames
    : [];
  const triviaResults = await searchTriviaQuestions(theme, subtopics);

  // ── Step 4: Compute each sub-signal (topic-type-aware) ──
  const contentDepth = computeContentDepth(wikiData, topicType, categoryData);
  const factDensity = computeFactDensity(wikiData, topicType, categoryData);
  const triviaCoverage = computeTriviaCoverage(triviaResults);
  const breadthAnalysis = computeBreadthBalance(wikiData, topicType, categoryData);
  const verifiabilityFlag = classifyVerifiability(theme);

  const signals: QuizzabilitySignals = {
    content_depth: contentDepth,
    fact_density: factDensity,
    existing_trivia_coverage: triviaCoverage,
    breadth_balance: breadthAnalysis.score,
    verifiability_flag: verifiabilityFlag,
  };

  // ── Step 5: Weighted aggregation into a single score ──
  const rawScore =
    contentDepth * weights.content_depth +
    factDensity * weights.fact_density +
    triviaCoverage * weights.existing_trivia_coverage +
    breadthAnalysis.score * weights.breadth_balance;

  // Apply verifiability modifiers
  let finalScore = rawScore;
  if (verifiabilityFlag === "subjective") {
    finalScore *= 0.7; // strong penalty for subjective themes
  } else if (verifiabilityFlag === "volatile") {
    finalScore *= 0.85; // moderate penalty for fast-changing themes
  }

  // Handle edge case: no Wikipedia article at all AND no category tree
  if (!wikiData.found && !categoryData.found) {
    finalScore = Math.min(finalScore, 15);
  }

  // Handle edge case: disambiguation page — theme is ambiguous
  // But only if it's NOT also an umbrella domain (some disambig pages
  // coexist with rich category trees)
  if (wikiData.isDisambiguation && topicType !== "umbrella") {
    finalScore = Math.min(finalScore, 30);
  }

  const quizzabilityScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // ── Step 6: Determine verdict ──
  const verdict = mapScoreToVerdict(quizzabilityScore);

  // ── Step 7: Generate human-readable notes (Romanian) ──
  const notes = generateNotes(
    theme,
    quizzabilityScore,
    signals,
    wikiData,
    triviaResults,
    breadthAnalysis,
    topicType,
    categoryData
  );

  // ── Step 8: Generate suggested reframe if applicable ──
  const suggestedReframe = generateReframe(
    theme,
    breadthAnalysis,
    wikiData,
    topicType,
    categoryData
  );

  const result: QuizzabilityResult = {
    theme,
    quizzability_score: quizzabilityScore,
    verdict,
    signals,
    notes,
  };

  if (suggestedReframe) {
    result.suggested_reframe = suggestedReframe;
  }

  return result;
}

/**
 * Map a 0–100 score to a Romanian verdict.
 */
function mapScoreToVerdict(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.accepted) return "acceptat";
  if (score >= VERDICT_THRESHOLDS.borderline) return "de verificat manual";
  return "respins";
}

/**
 * Generate a concise, Romanian-language explanation of why the
 * theme scored the way it did.
 */
function generateNotes(
  theme: string,
  score: number,
  signals: QuizzabilitySignals,
  wikiData: { found: boolean; isDisambiguation: boolean; isFallback: boolean; language: string; wordCount: number; sectionCount: number },
  triviaResults: Array<{ questionCount: number; isRomanianSource: boolean }>,
  breadthAnalysis: { isTooNarrow: boolean; isTooBroad: boolean },
  topicType: TopicType,
  categoryData: WikipediaCategoryData
): string {
  const parts: string[] = [];

  // ── No Wikipedia article AND no category tree ──
  if (!wikiData.found && !categoryData.found) {
    parts.push(
      `Nu a fost găsit niciun articol sau categorie Wikipedia pentru „${theme}". Fără o sursă de conținut verificabilă, tema nu poate susține o rundă de trivia.`
    );
    return parts.join(" ");
  }

  // ── Disambiguation page (only flag for leaf topics) ──
  if (wikiData.isDisambiguation && topicType !== "umbrella") {
    parts.push(
      `„${theme}" corespunde unei pagini de dezambiguizare pe Wikipedia — termenul are mai multe sensuri posibile. Recomandăm reformularea temei pentru a viza un subiect specific.`
    );
    return parts.join(" ");
  }

  // ── Umbrella domain identification ──
  if (topicType === "umbrella") {
    parts.push(
      `„${theme}" este un domeniu-umbrelă cu ${categoryData.totalArticles.toLocaleString()} articole și ${categoryData.totalSubcategories} subcategorii pe Wikipedia — sursă extrem de bogată de material pentru trivia.`
    );
  }

  // ── Fallback to English ──
  if (wikiData.isFallback || categoryData.isFallback) {
    parts.push(
      `Conținutul a fost preluat de pe Wikipedia în engleză — articolul/categoria în română este inexistent sau foarte scurt.`
    );
  }

  // ── Main driver identification ──
  const signalEntries: Array<[string, number]> = [
    ["profunzimea conținutului", signals.content_depth],
    ["densitatea faptelor", signals.fact_density],
    ["acoperirea în baze de trivia", signals.existing_trivia_coverage],
    ["echilibrul lărgimii temei", signals.breadth_balance],
  ];

  const sorted = [...signalEntries].sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (score >= 60) {
    parts.push(
      `Tema are un potențial excelent de quizzabilitate. Punctul forte principal: ${best[0]} (${best[1]}/100).`
    );
    if (worst[1] < 40) {
      parts.push(
        `Singura zonă mai slabă: ${worst[0]} (${worst[1]}/100).`
      );
    }
  } else if (score >= 35) {
    parts.push(
      `Tema este la limită. ${best[0]} este în regulă (${best[1]}/100), dar ${worst[0]} este problematic (${worst[1]}/100).`
    );
  } else {
    parts.push(
      `Tema nu are suficient material pentru o rundă completă de trivia. Principala problemă: ${worst[0]} (${worst[1]}/100).`
    );
  }

  // ── Breadth flags (only for leaf topics) ──
  if (topicType === "leaf") {
    if (breadthAnalysis.isTooNarrow) {
      parts.push(
        `Tema pare prea îngustă/nișată — există doar ${wikiData.sectionCount} secțiuni și ${wikiData.wordCount} de cuvinte pe Wikipedia, insuficient pentru 10+ întrebări non-repetitive.`
      );
    } else if (breadthAnalysis.isTooBroad) {
      parts.push(
        `Tema este foarte largă (${wikiData.sectionCount} secțiuni pe Wikipedia) — risc de a fi prea generică. Recomandăm o delimitare mai precisă.`
      );
    }
  }

  // ── Verifiability flags ──
  if (signals.verifiability_flag === "subjective") {
    parts.push(
      `⚠️ Tema pare subiectivă — întrebările de trivia au nevoie de răspunsuri clar verificabile, nu de opinii.`
    );
  } else if (signals.verifiability_flag === "volatile") {
    parts.push(
      `⚠️ Tema conține informații care se schimbă rapid — răspunsurile pot deveni învechite. Necesită verificare manuală.`
    );
  }

  // ── Trivia coverage note ──
  const totalTriviaQ = triviaResults.reduce(
    (sum, r) => sum + r.questionCount,
    0
  );
  if (totalTriviaQ > 10) {
    parts.push(
      `Există deja ${totalTriviaQ}+ întrebări de trivia existente pe această temă în bazele de date publice — semn pozitiv.`
    );
  } else if (totalTriviaQ === 0 && topicType === "leaf") {
    parts.push(
      `Nu au fost găsite întrebări existente în bazele de trivia publice — tema va necesita creare de conținut de la zero.`
    );
  }

  return parts.join(" ");
}

/**
 * Generate a suggested reframe for themes that are too narrow or too broad.
 * Returns undefined if no reframe is needed.
 */
function generateReframe(
  theme: string,
  breadthAnalysis: { isTooNarrow: boolean; isTooBroad: boolean },
  wikiData: { found: boolean; sectionTitles: string[]; sectionCount: number; isDisambiguation: boolean; disambiguationEntries: number },
  topicType: TopicType,
  categoryData: WikipediaCategoryData
): string | undefined {
  // Umbrella themes with good subtrees don't need reframing
  if (topicType === "umbrella" && categoryData.found && categoryData.totalArticles >= 50) {
    return undefined;
  }

  if (!breadthAnalysis.isTooNarrow && !breadthAnalysis.isTooBroad && !wikiData.isDisambiguation) {
    return undefined;
  }

  if (wikiData.isDisambiguation && topicType !== "umbrella") {
    return `Termenul „${theme}" are mai multe semnificații pe Wikipedia. Încearcă o variantă mai specifică, de exemplu adăugând un context (perioadă, domeniu, etc.).`;
  }

  if (breadthAnalysis.isTooBroad && topicType === "leaf") {
    // For leaf topics that are too broad, suggest narrowing via section titles
    if (wikiData.sectionTitles.length > 5) {
      const interestingSections = wikiData.sectionTitles
        .filter(
          (t) =>
            !t.toLowerCase().includes("referințe") &&
            !t.toLowerCase().includes("bibliografie") &&
            !t.toLowerCase().includes("vezi și") &&
            !t.toLowerCase().includes("legături") &&
            !t.toLowerCase().includes("note") &&
            !t.toLowerCase().includes("references") &&
            !t.toLowerCase().includes("see also") &&
            !t.toLowerCase().includes("external links")
        )
        .slice(0, 4);

      if (interestingSections.length > 0) {
        return `Tema „${theme}" este foarte largă. Încearcă ceva mai specific, de exemplu: „${interestingSections[0]}" sau „${interestingSections[1] || interestingSections[0]}".`;
      }
    }
    return `Tema „${theme}" este foarte largă. Încearcă să o restrângi la o perioadă, un sub-domeniu sau un aspect specific.`;
  }

  if (breadthAnalysis.isTooNarrow) {
    return `Tema „${theme}" pare prea îngustă pentru 10+ întrebări. Încearcă o variantă mai largă sau un domeniu adiacent care include acest subiect.`;
  }

  return undefined;
}
