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
import { recognizeDomain } from "./domains.js";

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
  // ── Step 0: Domain recognition (local, instant, no API calls) ──
  // This provides a reliable baseline for known academic/knowledge domains
  // independent of Wikipedia API availability.
  const domainInfo = recognizeDomain(theme);

  // ── Step 1: Fetch raw data from external sources (in parallel) ──
  // Fetch article data AND category data simultaneously
  const [wikiData, categoryData] = await Promise.all([
    fetchWikipediaData(theme),
    fetchCategoryData(theme),
  ]);

  // ── Step 2: Topic-type detection (umbrella vs leaf) ──
  // Use both category data AND domain recognition to classify.
  // If domain recognition says tier 1 (broad umbrella), force umbrella
  // even if the category traversal came back sparse (API might have failed).
  let topicType = classifyTopicType(categoryData);
  if (domainInfo.tier === 1 && topicType !== "umbrella") {
    topicType = "umbrella";
    console.log(
      `[quizzability/engine] Domain recognition overrode topic type to "umbrella" ` +
      `for "${theme}" (tier 1 domain: ${domainInfo.domainKey})`
    );
  }

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

  // ── Step 5b: Consistency guard between signals ──
  // If content_depth or existing_trivia_coverage is high but fact_density
  // is near 0, this signals a fact-extraction scoping bug, not a genuinely
  // fact-free theme. Correct by boosting fact_density to at least the
  // minimum of the other strong signals.
  let correctedFactDensity = factDensity;
  const strongSignalThreshold = 40;
  const factDensityFloor = 10;

  if (factDensity < factDensityFloor) {
    const otherSignalsHigh =
      (contentDepth >= strongSignalThreshold ? 1 : 0) +
      (triviaCoverage >= strongSignalThreshold ? 1 : 0) +
      (breadthAnalysis.score >= strongSignalThreshold ? 1 : 0);

    if (otherSignalsHigh >= 2) {
      const strongValues = [contentDepth, triviaCoverage, breadthAnalysis.score]
        .filter((v) => v >= strongSignalThreshold);
      const minStrong = Math.min(...strongValues);
      correctedFactDensity = Math.max(factDensity, Math.round(minStrong * 0.5));

      console.warn(
        `[quizzability/engine] Consistency guard triggered for "${theme}": ` +
        `fact_density=${factDensity} corrected to ${correctedFactDensity} ` +
        `(content_depth=${contentDepth}, trivia=${triviaCoverage}, breadth=${breadthAnalysis.score})`
      );
    }
  }

  // Update signals with corrected value
  if (correctedFactDensity !== factDensity) {
    signals.fact_density = correctedFactDensity;
  }

  // Recompute raw score with corrected fact_density
  const correctedRawScore =
    contentDepth * weights.content_depth +
    correctedFactDensity * weights.fact_density +
    triviaCoverage * weights.existing_trivia_coverage +
    breadthAnalysis.score * weights.breadth_balance;

  // Apply verifiability modifiers
  let apiScore = correctedRawScore;
  if (verifiabilityFlag === "subjective") {
    apiScore *= 0.7; // strong penalty for subjective themes
  } else if (verifiabilityFlag === "volatile") {
    apiScore *= 0.85; // moderate penalty for fast-changing themes
  }

  // Handle edge case: disambiguation page — theme is ambiguous
  // But only if it's NOT also an umbrella domain (some disambig pages
  // coexist with rich category trees)
  if (wikiData.isDisambiguation && topicType !== "umbrella" && !domainInfo.recognized) {
    apiScore = Math.min(apiScore, 30);
  }

  // Handle edge case: no Wikipedia article AND no category tree
  // BUT only cap score for unrecognized domains — recognized domains
  // get their floor from domain recognition regardless of API results.
  if (!wikiData.found && !categoryData.found && !domainInfo.recognized) {
    apiScore = Math.min(apiScore, 15);
  }

  // ── Step 5c: Apply domain recognition floor + boost ──
  // For recognized domains, the final score is at least the domain floor,
  // and gets a small boost on top of the API score.
  // This is the safety net that ensures "matematică", "istorie", etc.
  // score correctly even when Wikipedia APIs fail or return sparse data.
  const boostedApiScore = apiScore + domainInfo.boostScore;
  const finalScore = Math.max(domainInfo.floorScore, boostedApiScore);

  if (domainInfo.recognized && domainInfo.floorScore > boostedApiScore) {
    console.log(
      `[quizzability/engine] Domain floor applied for "${theme}": ` +
      `apiScore=${Math.round(apiScore)} + boost=${domainInfo.boostScore} = ${Math.round(boostedApiScore)}, ` +
      `floor=${domainInfo.floorScore} → using floor. ` +
      `(tier ${domainInfo.tier}, domain: ${domainInfo.domainKey})`
    );
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
    categoryData,
    domainInfo
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

  // ── Step 9: Sanity check — score vs explanation consistency ──
  // If the notes describe the theme as rich/excellent but the numeric
  // verdict is "respins", or if notes describe it as poor but verdict
  // is "acceptat", flag the mismatch as a likely scoring bug.
  const notesDescribePositive =
    notes.includes("potențial excelent") ||
    notes.includes("sursă extrem de bogată") ||
    notes.includes("semn pozitiv");
  const notesDescribeNegative =
    notes.includes("nu are suficient material") ||
    notes.includes("prea îngustă");

  if (notesDescribePositive && verdict === "respins") {
    console.warn(
      `[quizzability/engine] SANITY CHECK FAILED for "${theme}": ` +
      `Notes describe theme positively but verdict="${verdict}" (score=${quizzabilityScore}). ` +
      `Signals: depth=${signals.content_depth}, facts=${signals.fact_density}, ` +
      `trivia=${signals.existing_trivia_coverage}, breadth=${signals.breadth_balance}. ` +
      `This mismatch suggests the scoring formula is miscalibrated for this theme type.`
    );
  }
  if (notesDescribeNegative && verdict === "acceptat") {
    console.warn(
      `[quizzability/engine] SANITY CHECK FAILED for "${theme}": ` +
      `Notes describe theme negatively but verdict="${verdict}" (score=${quizzabilityScore}). ` +
      `This mismatch suggests the explanation generator is reading stale signals.`
    );
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
  categoryData: WikipediaCategoryData,
  domainInfo: { recognized: boolean; tier: number; domainKey: string; floorScore: number }
): string {
  const parts: string[] = [];

  // ── Recognized domain identification ──
  if (domainInfo.recognized && domainInfo.tier <= 2) {
    if (domainInfo.tier === 1) {
      parts.push(
        `„${theme}" este recunoscut ca un domeniu academic/cultural larg — excelent pentru trivia, cu o bază vastă de material verificabil.`
      );
    } else if (domainInfo.tier === 2) {
      parts.push(
        `„${theme}" este un sub-domeniu bine cunoscut — foarte bun pentru trivia, cu material suficient pentru o rundă completă.`
      );
    }
  }

  // ── No Wikipedia article AND no category tree ──
  if (!wikiData.found && !categoryData.found) {
    if (domainInfo.recognized) {
      // Domain is recognized but Wikipedia data is missing — not fatal
      parts.push(
        `Nu a fost găsit un articol Wikipedia dedicat, dar tema aparține unui domeniu bine documentat.`
      );
    } else {
      parts.push(
        `Nu a fost găsit niciun articol sau categorie Wikipedia pentru „${theme}". Fără o sursă de conținut verificabilă, tema nu poate susține o rundă de trivia.`
      );
      return parts.join(" ");
    }
  }

  // ── Disambiguation page (only flag for leaf topics) ──
  if (wikiData.isDisambiguation && topicType !== "umbrella" && !domainInfo.recognized) {
    parts.push(
      `„${theme}" corespunde unei pagini de dezambiguizare pe Wikipedia — termenul are mai multe sensuri posibile. Recomandăm reformularea temei pentru a viza un subiect specific.`
    );
    return parts.join(" ");
  }

  // ── Umbrella domain identification (from category data) ──
  if (topicType === "umbrella" && categoryData.found) {
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

  signalEntries.sort((a, b) => b[1] - a[1]);

  const bestSignal = signalEntries[0];
  const worstSignal = signalEntries[signalEntries.length - 1];

  if (score >= 60) {
    parts.push(
      `Tema are un potențial excelent de quizzabilitate.`
    );
    if (bestSignal[1] > 0) {
      parts.push(`Punctul forte principal: ${bestSignal[0]} (${bestSignal[1]}/100).`);
    }
    if (worstSignal[1] < 100) {
      parts.push(`Singura zonă mai slabă: ${worstSignal[0]} (${worstSignal[1]}/100).`);
    }
  } else if (score >= 35) {
    parts.push(
      `Tema este la limită. ${bestSignal[0]} este în regulă (${bestSignal[1]}/100), dar ${worstSignal[0]} este problematic (${worstSignal[1]}/100).`
    );
  } else {
    parts.push(
      `Tema nu are suficient material pentru o rundă completă de trivia. Principala problemă: ${worstSignal[0]} (${worstSignal[1]}/100).`
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
