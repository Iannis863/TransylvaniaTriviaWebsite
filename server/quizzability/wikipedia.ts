// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Wikipedia REST API Integration
// Primary data source: ro.wikipedia.org, with en.wikipedia.org fallback.
// Now includes category-tree traversal for umbrella theme detection.
// ─────────────────────────────────────────────────────────────

import type { WikipediaArticleData, WikipediaCategoryData, TopicType } from "./types.js";
import { ThemeCache } from "./cache.js";
import { CATEGORY_PARAMS } from "./config.js";

/** Shared cache — one entry per theme, survives across requests. */
const wikiCache = new ThemeCache<WikipediaArticleData>(120); // 2-hour TTL
const categoryCache = new ThemeCache<WikipediaCategoryData>(120);

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
 * Fetch category subtree data for a theme.
 * Tries to find a Wikipedia category page matching the theme, then
 * recursively traverses its subtree to count descendant articles and
 * subcategories.
 *
 * Tries Romanian Wikipedia first; falls back to English.
 */
export async function fetchCategoryData(
  theme: string
): Promise<WikipediaCategoryData> {
  const cached = categoryCache.get(theme);
  if (cached) return cached;

  let data = await queryCategoryTree(theme, "ro");

  // Fallback to English if Romanian category is not found or very sparse
  if (!data.found || data.totalArticles < 10) {
    const enData = await queryCategoryTree(theme, "en");
    if (enData.found && enData.totalArticles > data.totalArticles) {
      enData.isFallback = true;
      data = enData;
    }
  }

  categoryCache.set(theme, data);
  return data;
}

/**
 * Determine whether a theme is an umbrella domain or a leaf topic,
 * based on the category subtree size.
 */
export function classifyTopicType(
  categoryData: WikipediaCategoryData
): TopicType {
  if (
    categoryData.found &&
    categoryData.totalArticles >= CATEGORY_PARAMS.umbrellaThreshold
  ) {
    return "umbrella";
  }
  return "leaf";
}

// ─────────────────────────────────────────────────────────────
// Category tree traversal
// ─────────────────────────────────────────────────────────────

/**
 * Find and traverse a Wikipedia category tree for a theme.
 */
async function queryCategoryTree(
  theme: string,
  lang: "ro" | "en"
): Promise<WikipediaCategoryData> {
  const empty: WikipediaCategoryData = {
    found: false,
    categoryTitle: "",
    language: lang,
    totalArticles: 0,
    totalSubcategories: 0,
    directSubcategoryNames: [],
    avgBranchRichness: 0,
    isFallback: false,
  };

  try {
    // ── Step 1: Find the category page for this theme ──
    // Try "Categorie:{theme}" (ro) or "Category:{theme}" (en) directly
    const categoryPrefix = lang === "ro" ? "Categorie" : "Category";
    const candidateTitle = `${categoryPrefix}:${theme}`;

    // Check if this category exists
    const checkUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: candidateTitle,
        format: "json",
        origin: "*",
      }).toString();

    const checkRes = await fetchWithTimeout(checkUrl);
    if (!checkRes.ok) return empty;

    const checkJson = await checkRes.json();
    const pages = checkJson?.query?.pages;
    if (!pages) return empty;

    const pageId = Object.keys(pages)[0];
    let categoryTitle: string;

    if (pageId !== "-1") {
      // Direct category exists
      categoryTitle = candidateTitle;
    } else {
      // Try searching for a matching category
      const searchUrl =
        `https://${lang}.wikipedia.org/w/api.php?` +
        new URLSearchParams({
          action: "query",
          list: "search",
          srsearch: theme,
          srnamespace: "14", // Category namespace
          srlimit: "5",
          format: "json",
          origin: "*",
        }).toString();

      const searchRes = await fetchWithTimeout(searchUrl);
      if (!searchRes.ok) return empty;

      const searchJson = await searchRes.json();
      const searchResults = searchJson?.query?.search;
      if (!searchResults || searchResults.length === 0) return empty;

      // Pick the best match (first result in category namespace)
      categoryTitle = searchResults[0].title;

      // Make sure it starts with the category prefix
      if (!categoryTitle.startsWith(categoryPrefix + ":")) {
        categoryTitle = `${categoryPrefix}:${searchResults[0].title}`;
      }
    }

    // ── Step 2: Recursively traverse the category tree ──
    const traversalResult = await traverseCategory(
      categoryTitle,
      lang,
      CATEGORY_PARAMS.maxTraversalDepth
    );

    // ── Step 3: Sample articles for branch richness ──
    let avgBranchRichness = 0;
    if (traversalResult.sampleArticleTitles.length > 0) {
      avgBranchRichness = await sampleArticleRichness(
        traversalResult.sampleArticleTitles,
        lang
      );
    }

    const result: WikipediaCategoryData = {
      found: true,
      categoryTitle,
      language: lang,
      totalArticles: traversalResult.totalArticles,
      totalSubcategories: traversalResult.totalSubcategories,
      directSubcategoryNames: traversalResult.directSubcategoryNames,
      avgBranchRichness,
      isFallback: false,
    };

    return result;
  } catch (err) {
    console.error(
      `[quizzability/wikipedia] Category tree error for "${theme}" on ${lang}:`,
      err
    );
    return empty;
  }
}

interface TraversalResult {
  totalArticles: number;
  totalSubcategories: number;
  directSubcategoryNames: string[];
  /** A sample of article titles from the subtree (for richness scoring). */
  sampleArticleTitles: string[];
}

/**
 * Recursively traverse a Wikipedia category tree, counting articles
 * and subcategories up to a configurable depth.
 */
async function traverseCategory(
  categoryTitle: string,
  lang: "ro" | "en",
  maxDepth: number
): Promise<TraversalResult> {
  let totalArticles = 0;
  let totalSubcategories = 0;
  const directSubcategoryNames: string[] = [];
  const sampleArticleTitles: string[] = [];
  const visited = new Set<string>();

  async function recurse(catTitle: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(catTitle)) return;
    visited.add(catTitle);

    let cmcontinue: string | undefined;
    let iterationCount = 0;

    do {
      // Fetch category members (both subcategories and articles)
      const params: Record<string, string> = {
        action: "query",
        list: "categorymembers",
        cmtitle: catTitle,
        cmlimit: "50",
        cmprop: "title|type",
        format: "json",
        origin: "*",
      };
      if (cmcontinue) {
        params.cmcontinue = cmcontinue;
      }

      const url =
        `https://${lang}.wikipedia.org/w/api.php?` +
        new URLSearchParams(params).toString();

      const res = await fetchWithTimeout(url);
      if (!res.ok) break;

      const json = await res.json();
      const members: Array<{ title: string; type: string }> =
        json?.query?.categorymembers || [];

      for (const member of members) {
        if (member.type === "subcat") {
          totalSubcategories++;
          if (depth === 0) {
            // Strip the category prefix for display
            const name = member.title.replace(/^(Categorie|Category):/, "");
            directSubcategoryNames.push(name);
          }
        } else if (member.type === "page") {
          totalArticles++;
          // Collect samples for richness scoring (spread across the tree)
          if (sampleArticleTitles.length < CATEGORY_PARAMS.richnessSampleSize) {
            // Take every Nth article to spread samples across the tree
            if (totalArticles % Math.max(1, Math.floor(50 / CATEGORY_PARAMS.richnessSampleSize)) === 0) {
              sampleArticleTitles.push(member.title);
            }
          }
        }
      }

      cmcontinue = json?.continue?.cmcontinue;
      iterationCount++;

      // Safety: don't follow too many pages per category
      if (iterationCount >= 4) break; // 4 * 50 = 200 members max per category
    } while (cmcontinue);

    // Recurse into subcategories (limited to prevent runaway)
    if (depth < maxDepth) {
      const subcatsToFollow = directSubcategoryNames.length > 0 && depth === 0
        ? directSubcategoryNames.slice(0, CATEGORY_PARAMS.maxSubcategoriesPerLevel)
        : [];

      // For deeper levels, collect subcats from the members we just fetched
      const memberSubcats: string[] = [];
      // Re-fetch if needed — but we already counted them above
      // We need the titles, which we collected for depth 0 in directSubcategoryNames
      // For deeper levels, we need a different approach

      if (depth === 0) {
        const categoryPrefix = lang === "ro" ? "Categorie" : "Category";
        for (const name of subcatsToFollow) {
          await recurse(`${categoryPrefix}:${name}`, depth + 1);
        }
      } else {
        // For deeper levels, re-query for subcategories only
        const subParams: Record<string, string> = {
          action: "query",
          list: "categorymembers",
          cmtitle: catTitle,
          cmtype: "subcat",
          cmlimit: CATEGORY_PARAMS.maxSubcategoriesPerLevel.toString(),
          cmprop: "title",
          format: "json",
          origin: "*",
        };

        const subUrl =
          `https://${lang}.wikipedia.org/w/api.php?` +
          new URLSearchParams(subParams).toString();

        const subRes = await fetchWithTimeout(subUrl);
        if (subRes.ok) {
          const subJson = await subRes.json();
          const subMembers: Array<{ title: string }> =
            subJson?.query?.categorymembers || [];

          for (const sub of subMembers.slice(0, CATEGORY_PARAMS.maxSubcategoriesPerLevel)) {
            await recurse(sub.title, depth + 1);
          }
        }
      }
    }
  }

  await recurse(categoryTitle, 0);

  return {
    totalArticles,
    totalSubcategories,
    directSubcategoryNames,
    sampleArticleTitles,
  };
}

/**
 * Sample a set of articles from the subtree and measure their average
 * word count as a proxy for "branch richness."
 */
async function sampleArticleRichness(
  titles: string[],
  lang: "ro" | "en"
): Promise<number> {
  if (titles.length === 0) return 0;

  try {
    // Batch-query extracts for all sample articles at once
    const url =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: titles.join("|"),
        prop: "extracts",
        exintro: "false",
        explaintext: "true",
        exlimit: titles.length.toString(),
        format: "json",
        origin: "*",
      }).toString();

    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) return 0;

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return 0;

    let totalWords = 0;
    let count = 0;

    for (const pageId of Object.keys(pages)) {
      if (pageId === "-1") continue;
      const extract: string = pages[pageId]?.extract || "";
      const words = extract.split(/\s+/).filter((w: string) => w.length > 0).length;
      totalWords += words;
      count++;
    }

    return count > 0 ? Math.round(totalWords / count) : 0;
  } catch (err) {
    console.error(
      `[quizzability/wikipedia] Richness sampling error:`,
      err
    );
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────
// Article-level queries (unchanged from original)
// ─────────────────────────────────────────────────────────────

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
