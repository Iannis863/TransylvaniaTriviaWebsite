// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Wikipedia REST API Integration
// Primary data source: ro.wikipedia.org, with en.wikipedia.org fallback.
// ─────────────────────────────────────────────────────────────

import type { WikipediaArticleData } from "./types.js";
import { ThemeCache } from "./cache.js";

/** Shared cache — one entry per theme, survives across requests. */
const wikiCache = new ThemeCache<WikipediaArticleData>(120); // 2-hour TTL

/**
 * Fetch & parse Wikipedia article data for a theme.
 * Tries Romanian Wikipedia first; falls back to English if the Romanian
 * article is missing or is a stub (< 200 words).
 */
export async function fetchWikipediaData(
  theme: string
): Promise<WikipediaArticleData> {
  const cached = wikiCache.get(theme);
  if (cached) return cached;

  // Try Romanian Wikipedia first
  let data = await queryWikipedia(theme, "ro");

  // Fallback to English if Romanian article is missing or stub-level
  if (!data.found || data.wordCount < 200) {
    const enData = await queryWikipedia(theme, "en");
    if (enData.found && enData.wordCount > data.wordCount) {
      enData.isFallback = true;
      data = enData;
    }
  }

  wikiCache.set(theme, data);
  return data;
}

/**
 * Query a specific Wikipedia language edition for article data.
 */
async function queryWikipedia(
  theme: string,
  lang: "ro" | "en"
): Promise<WikipediaArticleData> {
  const empty: WikipediaArticleData = {
    found: false,
    title: theme,
    language: lang,
    wordCount: 0,
    sectionCount: 0,
    sectionTitles: [],
    categoryCount: 0,
    seeAlsoCount: 0,
    linkCount: 0,
    isDisambiguation: false,
    disambiguationEntries: 0,
    extractText: "",
    isFallback: false,
  };

  try {
    // ── Step 1: Search for the article title ──
    const searchUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: theme,
        srlimit: "5",
        format: "json",
        origin: "*",
      }).toString();

    const searchRes = await fetchWithTimeout(searchUrl);
    if (!searchRes.ok) return empty;

    const searchJson = await searchRes.json();
    const searchResults = searchJson?.query?.search;
    if (!searchResults || searchResults.length === 0) return empty;

    // Pick the first result as our best match
    const pageTitle: string = searchResults[0].title;

    // ── Step 2: Fetch full article parse data ──
    const parseUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "parse",
        page: pageTitle,
        prop: "sections|categories|links|wikitext",
        format: "json",
        origin: "*",
      }).toString();

    const parseRes = await fetchWithTimeout(parseUrl);
    if (!parseRes.ok) return empty;

    const parseJson = await parseRes.json();
    if (parseJson.error) return empty;

    const parseData = parseJson.parse;

    // ── Step 3: Fetch plain-text extract for word count & fact analysis ──
    const extractUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: pageTitle,
        prop: "extracts|categories",
        exintro: "false",
        explaintext: "true",
        exlimit: "1",
        cllimit: "500",
        format: "json",
        origin: "*",
      }).toString();

    const extractRes = await fetchWithTimeout(extractUrl);
    if (!extractRes.ok) return empty;

    const extractJson = await extractRes.json();
    const pages = extractJson?.query?.pages;
    if (!pages) return empty;

    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") return empty;

    const page = pages[pageId];
    const extractText: string = page?.extract || "";
    const categories: Array<{ title: string }> = page?.categories || [];

    // ── Parse sections ──
    const sections: Array<{ line: string; level: string }> =
      parseData?.sections || [];
    const sectionTitles = sections.map(
      (s: { line: string }) => s.line
    );

    // ── Check for disambiguation ──
    const isDisambiguation =
      categories.some((c) =>
        c.title.toLowerCase().includes("dezambiguizare") ||
        c.title.toLowerCase().includes("disambiguation")
      ) ||
      (parseData?.wikitext?.["*"] || "").includes("{{dezambiguizare") ||
      (parseData?.wikitext?.["*"] || "").includes("{{Dezambiguizare") ||
      (parseData?.wikitext?.["*"] || "").includes("{{disambiguation") ||
      (parseData?.wikitext?.["*"] || "").includes("{{Disambiguation");

    // Count disambiguation entries (links on a disambig page)
    let disambiguationEntries = 0;
    if (isDisambiguation) {
      const wikitext: string = parseData?.wikitext?.["*"] || "";
      const lineMatches = wikitext.match(/^\*\s*\[\[/gm);
      disambiguationEntries = lineMatches ? lineMatches.length : 0;
    }

    // ── Compute "See also" count ──
    const seeAlsoLabels = lang === "ro"
      ? ["vezi și", "articole similare", "legături externe"]
      : ["see also", "related articles", "external links"];
    let seeAlsoCount = 0;
    const seeAlsoIndex = sectionTitles.findIndex((t) =>
      seeAlsoLabels.some((label) => t.toLowerCase().includes(label))
    );
    if (seeAlsoIndex !== -1) {
      // Count links in the See Also section (heuristic from parse links)
      const internalLinks: Array<{ exists: string }> =
        parseData?.links || [];
      // Approximate: see-also sections typically have 5–20 links
      seeAlsoCount = Math.min(
        internalLinks.filter((l) => l.exists !== undefined).length,
        50
      );
    }

    // ── Word count ──
    const wordCount = extractText
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

    // ── Link count ──
    const allLinks: Array<{ ns: number }> = parseData?.links || [];
    const linkCount = allLinks.filter((l) => l.ns === 0).length; // ns=0 = main namespace

    const result: WikipediaArticleData = {
      found: true,
      title: pageTitle,
      language: lang,
      wordCount,
      sectionCount: sections.length,
      sectionTitles,
      categoryCount: categories.length,
      seeAlsoCount,
      linkCount,
      isDisambiguation,
      disambiguationEntries,
      extractText: extractText.slice(0, 8000), // cap for memory
      isFallback: false,
    };

    return result;
  } catch (err) {
    console.error(
      `[quizzability/wikipedia] Error querying ${lang}.wikipedia for "${theme}":`,
      err
    );
    return empty;
  }
}

/**
 * Fetch with a timeout to avoid hanging on unresponsive APIs.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
