// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Calibration Test Set & Runner
// ~30 manually labeled themes spanning "obviously great,"
// "obviously bad," and "borderline" — used to validate and
// tune weights until the engine's verdicts match human judgment.
// ─────────────────────────────────────────────────────────────

import type { Verdict } from "./types.js";
import { scoreQuizzability } from "./engine.js";

/** A calibration theme with the expected human judgment. */
interface CalibrationEntry {
  theme: string;
  /** Human-labeled expected verdict. */
  expectedVerdict: Verdict;
  /** Why this theme should get this verdict (for documentation). */
  rationale: string;
}

/**
 * The calibration set: ~30 themes manually labeled by quizmasters.
 *
 * Categories:
 * - "obviously great": high popularity + deep content + many facts
 * - "obviously bad": too niche, too subjective, gibberish, or no content
 * - "borderline": could go either way, requires manual review
 */
export const CALIBRATION_SET: CalibrationEntry[] = [
  // ═══════════════ OBVIOUSLY GREAT (expected: "acceptat") ═══════════════
  {
    theme: "Al Doilea Război Mondial",
    expectedVerdict: "acceptat",
    rationale: "Massive Wikipedia article, thousands of facts, huge trivia corpus.",
  },
  {
    theme: "Istoria Romei Antice",
    expectedVerdict: "acceptat",
    rationale: "Deep historical topic with many verifiable facts, dates, figures.",
  },
  {
    theme: "The Simpsons",
    expectedVerdict: "acceptat",
    rationale: "Iconic TV show, massive trivia coverage, hundreds of episodes with distinct facts.",
  },
  {
    theme: "Geografie",
    expectedVerdict: "acceptat",
    rationale: "Broad but well-defined domain with endless quizzable facts.",
  },
  {
    theme: "Mitologia Greacă",
    expectedVerdict: "acceptat",
    rationale: "Rich topic — gods, heroes, myths, places — ideal for trivia.",
  },
  {
    theme: "Filmele lui Quentin Tarantino",
    expectedVerdict: "acceptat",
    rationale: "10+ films, each with distinct characters, quotes, facts.",
  },
  {
    theme: "Sistemul Solar",
    expectedVerdict: "acceptat",
    rationale: "8 planets + moons + facts = easily 50+ distinct questions.",
  },
  {
    theme: "Jocurile Olimpice",
    expectedVerdict: "acceptat",
    rationale: "Centuries of history, thousands of records, host cities, sports.",
  },
  {
    theme: "The Beatles",
    expectedVerdict: "acceptat",
    rationale: "Extensive discography, members, history — massive trivia potential.",
  },
  {
    theme: "Corpul Uman",
    expectedVerdict: "acceptat",
    rationale: "Anatomy, organs, systems — rich factual content for trivia.",
  },

  // ═══════════════ OBVIOUSLY BAD (expected: "respins") ═══════════════
  {
    theme: "Biologia lavandei",
    expectedVerdict: "respins",
    rationale: "Too narrow — one plant species, maybe 3-4 facts max.",
  },
  {
    theme: "Nunta vărului meu",
    expectedVerdict: "respins",
    rationale: "Personal event, no public knowledge base, unquizzable.",
  },
  {
    theme: "wfdsfaffas",
    expectedVerdict: "respins",
    rationale: "Gibberish — no Wikipedia article, no trivia, nothing.",
  },
  {
    theme: "Cele mai bune topinguri de pizza",
    expectedVerdict: "respins",
    rationale: "Subjective — no verifiable right answers.",
  },
  {
    theme: "Clasamentul actual al NBA",
    expectedVerdict: "respins",
    rationale: "Volatile — changes daily, answers become obsolete immediately.",
  },
  {
    theme: "Scaunul din sufrageria mea",
    expectedVerdict: "respins",
    rationale: "Too personal/specific, no public content.",
  },
  {
    theme: "Xylobranchii din Mariana",
    expectedVerdict: "respins",
    rationale: "Extremely niche scientific topic — no quiz material.",
  },
  {
    theme: "Gustul meu muzical",
    expectedVerdict: "respins",
    rationale: "Subjective and personal — no verifiable facts.",
  },
  {
    theme: "abc",
    expectedVerdict: "respins",
    rationale: "Too short/vague — not a real theme.",
  },
  {
    theme: "Culoarea mov",
    expectedVerdict: "respins",
    rationale: "Too narrow — one color can't sustain 10+ unique questions.",
  },

  // ═══════════════ BORDERLINE (expected: "de verificat manual") ═══════════════
  {
    theme: "Nikola Tesla",
    expectedVerdict: "de verificat manual",
    rationale: "Single historical figure — deep content but might be narrow for 10+ varied questions.",
  },
  {
    theme: "Cafeaua",
    expectedVerdict: "de verificat manual",
    rationale: "Surprisingly deep topic (history, chemistry, culture) but borderline.",
  },
  {
    theme: "Eurovision",
    expectedVerdict: "de verificat manual",
    rationale: "Niche popularity, but exists with dedicated fanbase. Might work for some audiences.",
  },
  {
    theme: "Minecraft",
    expectedVerdict: "de verificat manual",
    rationale: "Very popular game, but content is somewhat specialized/gaming-focused.",
  },
  {
    theme: "Brânzeturile Franței",
    expectedVerdict: "de verificat manual",
    rationale: "Surprisingly many varieties (~400+), but how many are quizzable?",
  },
  {
    theme: "Limba latină",
    expectedVerdict: "de verificat manual",
    rationale: "Academic subject with depth, but may be too niche for a general audience.",
  },
  {
    theme: "Formula 1",
    expectedVerdict: "de verificat manual",
    rationale: "Popular sport with many facts, but somewhat specialized audience.",
  },
  {
    theme: "Dinozaurii",
    expectedVerdict: "de verificat manual",
    rationale: "Good depth and breadth, should pass but not an obvious slam-dunk.",
  },
  {
    theme: "Craciunul",
    expectedVerdict: "de verificat manual",
    rationale: "Holiday with traditions, history, music — decent but potentially shallow.",
  },
  {
    theme: "Dacia",
    expectedVerdict: "de verificat manual",
    rationale: "Could mean the ancient kingdom or the car brand — ambiguity needs handling.",
  },
];

/**
 * Run the calibration test suite and report results.
 * Returns a detailed report showing where the engine agrees/disagrees
 * with human judgment.
 */
export async function runCalibration(): Promise<CalibrationReport> {
  const results: CalibrationTestResult[] = [];
  let correct = 0;
  let total = CALIBRATION_SET.length;

  console.log(
    `\n🧪 Running quizzability calibration on ${total} themes...\n`
  );

  for (const entry of CALIBRATION_SET) {
    try {
      const result = await scoreQuizzability(entry.theme);
      const match = result.verdict === entry.expectedVerdict;
      if (match) correct++;

      results.push({
        theme: entry.theme,
        expectedVerdict: entry.expectedVerdict,
        actualVerdict: result.verdict,
        score: result.quizzability_score,
        signals: result.signals,
        match,
        notes: result.notes,
      });

      const icon = match ? "✅" : "❌";
      console.log(
        `${icon} "${entry.theme}" → score=${result.quizzability_score}, ` +
          `verdict="${result.verdict}" (expected: "${entry.expectedVerdict}")`
      );
    } catch (err) {
      results.push({
        theme: entry.theme,
        expectedVerdict: entry.expectedVerdict,
        actualVerdict: "respins",
        score: 0,
        signals: {
          content_depth: 0,
          fact_density: 0,
          existing_trivia_coverage: 0,
          breadth_balance: 0,
          verifiability_flag: "static",
        },
        match: entry.expectedVerdict === "respins",
        notes: `Error: ${err}`,
      });
      console.error(`⚠️ Error scoring "${entry.theme}":`, err);
    }

    // Rate limiting: small delay between API calls
    await delay(300);
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  console.log(`\n📊 Calibration Results: ${correct}/${total} correct (${accuracy}%)\n`);

  // Identify systematic issues
  const mismatches = results.filter((r) => !r.match);
  if (mismatches.length > 0) {
    console.log(`\n⚠️ Mismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      console.log(
        `   "${m.theme}": expected "${m.expectedVerdict}", got "${m.actualVerdict}" (score: ${m.score})`
      );
      console.log(
        `   Signals: depth=${m.signals.content_depth}, facts=${m.signals.fact_density}, ` +
          `trivia=${m.signals.existing_trivia_coverage}, breadth=${m.signals.breadth_balance}, ` +
          `verify=${m.signals.verifiability_flag}`
      );
    }
  }

  return {
    total,
    correct,
    accuracy,
    results,
    mismatches,
  };
}

/** Individual test result. */
interface CalibrationTestResult {
  theme: string;
  expectedVerdict: Verdict;
  actualVerdict: Verdict;
  score: number;
  signals: {
    content_depth: number;
    fact_density: number;
    existing_trivia_coverage: number;
    breadth_balance: number;
    verifiability_flag: string;
  };
  match: boolean;
  notes: string;
}

/** Aggregate calibration report. */
export interface CalibrationReport {
  total: number;
  correct: number;
  accuracy: number;
  results: CalibrationTestResult[];
  mismatches: CalibrationTestResult[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
