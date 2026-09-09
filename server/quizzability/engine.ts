// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Main Orchestrator
// Takes a theme string, fetches data, computes signals,
// aggregates into a final score, and returns the JSON contract.
// ─────────────────────────────────────────────────────────────

import type {
  QuizzabilityResult,
  QuizzabilityWeights,
  Verdict,
  QuizzabilitySignals,
} from "./types.js";
import { DEFAULT_WEIGHTS, VERDICT_THRESHOLDS } from "./config.js";
import { fetchWikipediaData } from "./wikipedia.js";
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
  const [wikiData, triviaResults] = await Promise.all([
    fetchWikipediaData(theme),
    searchTriviaQuestions(theme),
  ]);

  // ── Step 2: Compute each sub-signal ──
  const contentDepth = computeContentDepth(wikiData);
  const factDensity = computeFactDensity(wikiData);
  const triviaCoverage = computeTriviaCoverage(triviaResults);
  const breadthAnalysis = computeBreadthBalance(wikiData);
  const verifiabilityFlag = classifyVerifiability(theme);

  const signals: QuizzabilitySignals = {
    content_depth: contentDepth,
    fact_density: factDensity,
    existing_trivia_coverage: triviaCoverage,
    breadth_balance: breadthAnalysis.score,
    verifiability_flag: verifiabilityFlag,
  };

  // ── Step 3: Weighted aggregation into a single score ──
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

  // Handle edge case: no Wikipedia article at all
  if (!wikiData.found) {
    finalScore = Math.min(finalScore, 15);
  }

  // Handle edge case: disambiguation page — theme is ambiguous
  if (wikiData.isDisambiguation) {
    finalScore = Math.min(finalScore, 30);
  }

  const quizzabilityScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // ── Step 4: Determine verdict ──
  const verdict = mapScoreToVerdict(quizzabilityScore);

  // ── Step 5: Generate human-readable notes (Romanian) ──
  const notes = generateNotes(
    theme,
    quizzabilityScore,
    signals,
    wikiData,
    triviaResults,
    breadthAnalysis
  );

  // ── Step 6: Generate suggested reframe if applicable ──
  const suggestedReframe = generateReframe(
    theme,
    breadthAnalysis,
    wikiData
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
  breadthAnalysis: { isTooNarrow: boolean; isTooBroad: boolean }
): string {
  const parts: string[] = [];

  // ── No Wikipedia article ──
  if (!wikiData.found) {
    parts.push(
      `Nu a fost găsit niciun articol Wikipedia pentru „${theme}". Fără o sursă de conținut verificabilă, tema nu poate susține o rundă de trivia.`
    );
    return parts.join(" ");
  }

  // ── Disambiguation page ──
  if (wikiData.isDisambiguation) {
    parts.push(
      `„${theme}" corespunde unei pagini de dezambiguizare pe Wikipedia — termenul are mai multe sensuri posibile. Recomandăm reformularea temei pentru a viza un subiect specific.`
    );
    return parts.join(" ");
  }

  // ── Fallback to English ──
  if (wikiData.isFallback) {
    parts.push(
      `Conținutul a fost preluat de pe Wikipedia în engleză — articolul în română este inexistent sau foarte scurt.`
    );
  }

  // ── Main driver identification ──
  const signalEntries: Array<[string, number]> = [
    ["profunzimea conținutului", signals.content_depth],
    ["densitatea faptelor", signals.fact_density],
    ["acoperirea în baze de trivia", signals.existing_trivia_coverage],
    ["echilibrul lărgimii temei", signals.breadth_balance],
  ];

  // Sort to find highest and lowest signals
  const sorted = [...signalEntries].sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (score >= 60) {
    // Positive verdict
    parts.push(
      `Tema are un potențial excelent de quizzabilitate. Punctul forte principal: ${best[0]} (${best[1]}/100).`
    );
    if (worst[1] < 40) {
      parts.push(
        `Singura zonă mai slabă: ${worst[0]} (${worst[1]}/100).`
      );
    }
  } else if (score >= 35) {
    // Borderline
    parts.push(
      `Tema este la limită. ${best[0]} este în regulă (${best[1]}/100), dar ${worst[0]} este problematic (${worst[1]}/100).`
    );
  } else {
    // Rejected
    parts.push(
      `Tema nu are suficient material pentru o rundă completă de trivia. Principala problemă: ${worst[0]} (${worst[1]}/100).`
    );
  }

  // ── Breadth flags ──
  if (breadthAnalysis.isTooNarrow) {
    parts.push(
      `Tema pare prea îngustă/nișată — există doar ${wikiData.sectionCount} secțiuni și ${wikiData.wordCount} de cuvinte pe Wikipedia, insuficient pentru 10+ întrebări non-repetitive.`
    );
  } else if (breadthAnalysis.isTooBroad) {
    parts.push(
      `Tema este foarte largă (${wikiData.sectionCount} secțiuni pe Wikipedia) — risc de a fi prea generică. Recomandăm o delimitare mai precisă.`
    );
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
  } else if (totalTriviaQ === 0) {
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
  wikiData: { found: boolean; sectionTitles: string[]; sectionCount: number; isDisambiguation: boolean; disambiguationEntries: number }
): string | undefined {
  if (!breadthAnalysis.isTooNarrow && !breadthAnalysis.isTooBroad && !wikiData.isDisambiguation) {
    return undefined;
  }

  if (wikiData.isDisambiguation) {
    return `Termenul „${theme}" are mai multe semnificații pe Wikipedia. Încearcă o variantă mai specifică, de exemplu adăugând un context (perioadă, domeniu, etc.).`;
  }

  if (breadthAnalysis.isTooBroad) {
    // Suggest narrowing based on the article's section titles
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
