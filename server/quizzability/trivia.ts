// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Open Trivia API Integration
// Queries public trivia databases to check if existing quiz
// questions exist for a given theme.
// ─────────────────────────────────────────────────────────────

import type { TriviaSearchResult } from "./types.js";
import { ThemeCache } from "./cache.js";

/** Cache for trivia lookups — keyed by normalized theme. */
const triviaCache = new ThemeCache<TriviaSearchResult[]>(120);

/**
 * OpenTDB category mapping.
 * Maps common Romanian theme keywords to OpenTDB category IDs.
 * See: https://opentdb.com/api_category.php
 */
const OPENTDB_CATEGORY_MAP: Record<string, number> = {
  // Knowledge domains
  "cultura generala": 9,
  "cultura generală": 9,
  "general knowledge": 9,
  "carti": 10,
  "cărți": 10,
  "literatura": 10,
  "literatură": 10,
  "film": 11,
  "filme": 11,
  "cinema": 11,
  "muzica": 12,
  "muzică": 12,
  "musicals": 13,
  "teatru": 13,
  "televiziune": 14,
  "tv": 14,
  "jocuri video": 15,
  "jocuri": 15,
  "board games": 16,
  "jocuri de societate": 16,
  "stiinta": 17,
  "știință": 17,
  "știința": 17,
  "science": 17,
  "calculatoare": 18,
  "informatica": 18,
  "informatică": 18,
  "computers": 18,
  "matematica": 19,
  "matematică": 19,
  "mitologie": 20,
  "mitologia": 20,
  "sport": 21,
  "sporturi": 21,
  "geografie": 22,
  "istorie": 23,
  "politica": 24,
  "politică": 24,
  "arta": 25,
  "artă": 25,
  "celebritati": 26,
  "celebrități": 26,
  "animale": 27,
  "vehicule": 28,
  "benzi desenate": 29,
  "comics": 29,
  "gadgets": 30,
  "anime": 31,
  "manga": 31,
  "desene animate": 32,
  "cartoons": 32,
};

/**
 * Search for existing trivia questions related to a theme.
 * Queries OpenTDB and other available public trivia sources.
 */
export async function searchTriviaQuestions(
  theme: string
): Promise<TriviaSearchResult[]> {
  const cached = triviaCache.get(theme);
  if (cached) return cached;

  const results: TriviaSearchResult[] = [];

  // ── Source 1: OpenTDB (Open Trivia Database) ──
  const opentdbResult = await queryOpenTDB(theme);
  if (opentdbResult) {
    results.push(opentdbResult);
  }

  // ── Source 2: jService (Jeopardy! questions) ──
  const jserviceResult = await queryJService(theme);
  if (jserviceResult) {
    results.push(jserviceResult);
  }

  triviaCache.set(theme, results);
  return results;
}

/**
 * Query Open Trivia Database (opentdb.com).
 * First tries to match theme to a known category, then fetches questions.
 */
async function queryOpenTDB(
  theme: string
): Promise<TriviaSearchResult | null> {
  try {
    const lower = theme.toLowerCase().trim();

    // Try to find a matching category
    let categoryId: number | null = null;
    for (const [keyword, id] of Object.entries(OPENTDB_CATEGORY_MAP)) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        categoryId = id;
        break;
      }
    }

    if (categoryId === null) {
      // No direct category match — try fuzzy: check if any keyword is a substring
      for (const [keyword, id] of Object.entries(OPENTDB_CATEGORY_MAP)) {
        const themeWords = lower.split(/\s+/);
        const keywordWords = keyword.split(/\s+/);
        if (
          themeWords.some((tw) =>
            keywordWords.some(
              (kw) =>
                (tw.length >= 4 && kw.startsWith(tw)) ||
                (kw.length >= 4 && tw.startsWith(kw))
            )
          )
        ) {
          categoryId = id;
          break;
        }
      }
    }

    if (categoryId === null) {
      // Theme doesn't map to any OpenTDB category
      return {
        questionCount: 0,
        distinctQuestionCount: 0,
        source: "OpenTDB",
        isRomanianSource: false,
      };
    }

    // Fetch category question count
    const countUrl = `https://opentdb.com/api_count.php?category=${categoryId}`;
    const countRes = await fetchWithTimeout(countUrl);
    if (!countRes.ok) {
      return {
        questionCount: 0,
        distinctQuestionCount: 0,
        source: "OpenTDB",
        isRomanianSource: false,
      };
    }

    const countJson = await countRes.json();
    const counts = countJson?.category_question_count;

    if (!counts) {
      return {
        questionCount: 0,
        distinctQuestionCount: 0,
        source: "OpenTDB",
        isRomanianSource: false,
      };
    }

    const totalCount: number =
      counts.total_question_count || 0;

    // Fetch a sample of actual questions to assess distinctness
    let distinctCount = 0;
    if (totalCount > 0) {
      const sampleUrl =
        `https://opentdb.com/api.php?` +
        new URLSearchParams({
          amount: "20",
          category: categoryId.toString(),
          type: "multiple",
        }).toString();

      const sampleRes = await fetchWithTimeout(sampleUrl);
      if (sampleRes.ok) {
        const sampleJson = await sampleRes.json();
        if (sampleJson.response_code === 0 && sampleJson.results) {
          const questions: string[] = sampleJson.results.map(
            (q: { question: string }) => q.question
          );
          const uniqueQuestions = new Set(questions);
          // Extrapolate: if sample has X% unique, assume same for total
          const uniqueRatio =
            questions.length > 0
              ? uniqueQuestions.size / questions.length
              : 0;
          distinctCount = Math.round(totalCount * uniqueRatio);
        }
      } else {
        // If sample fetch fails (rate limit), assume ~80% distinctness
        distinctCount = Math.round(totalCount * 0.8);
      }
    }

    return {
      questionCount: totalCount,
      distinctQuestionCount: distinctCount,
      source: "OpenTDB",
      isRomanianSource: false,
    };
  } catch (err) {
    console.error(
      `[quizzability/trivia] OpenTDB query failed for "${theme}":`,
      err
    );
    return null;
  }
}

/**
 * Query jService API (Jeopardy! question archive).
 * Uses the search endpoint to find clues matching the theme.
 */
async function queryJService(
  theme: string
): Promise<TriviaSearchResult | null> {
  try {
    const searchUrl =
      `https://jservice.io/api/clues?` +
      new URLSearchParams({
        value: "200",   // common clue value
      }).toString();

    // jService doesn't have a text search endpoint in its free tier,
    // so we search by category name instead
    const catSearchUrl =
      `https://jservice.io/api/categories?count=10&offset=0`;

    const catRes = await fetchWithTimeout(catSearchUrl, 5000);
    if (!catRes.ok) {
      return null;
    }

    // Since jService's search is limited, we do a best-effort approach:
    // search for categories matching the theme
    const lower = theme.toLowerCase();
    const categoryUrl =
      `https://jservice.io/api/categories?count=100&offset=0`;
    const fullCatRes = await fetchWithTimeout(categoryUrl, 5000);

    if (!fullCatRes.ok) {
      return {
        questionCount: 0,
        distinctQuestionCount: 0,
        source: "jService (Jeopardy!)",
        isRomanianSource: false,
      };
    }

    const categories: Array<{ id: number; title: string; clues_count: number }> =
      await fullCatRes.json();

    // Find categories whose title contains our theme (or vice versa)
    const matching = categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(lower) ||
        lower.includes(cat.title.toLowerCase())
    );

    const totalClues = matching.reduce(
      (sum, cat) => sum + (cat.clues_count || 0),
      0
    );

    return {
      questionCount: totalClues,
      distinctQuestionCount: Math.round(totalClues * 0.9), // Jeopardy clues are generally unique
      source: "jService (Jeopardy!)",
      isRomanianSource: false,
    };
  } catch (err) {
    // jService is unreliable — fail gracefully
    console.error(
      `[quizzability/trivia] jService query failed for "${theme}":`,
      err
    );
    return null;
  }
}

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
