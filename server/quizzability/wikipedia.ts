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
    sampleExtractTexts: [],
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
    let categoryTitle: string = "";

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
      let searchResults = searchJson?.query?.search;

      // Fallback: try with diacritics stripped
      if ((!searchResults || searchResults.length === 0)) {
        const stripped = theme
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (stripped !== theme) {
          // Also try direct title with stripped diacritics
          const strippedCandidateTitle = `${categoryPrefix}:${stripped}`;
          const strippedCheckUrl =
            `https://${lang}.wikipedia.org/w/api.php?` +
            new URLSearchParams({
              action: "query",
              titles: strippedCandidateTitle,
              format: "json",
              origin: "*",
            }).toString();
          try {
            const strippedCheckRes = await fetchWithTimeout(strippedCheckUrl);
            if (strippedCheckRes.ok) {
              const strippedCheckJson = await strippedCheckRes.json();
              const strippedPages = strippedCheckJson?.query?.pages;
              if (strippedPages) {
                const strippedPageId = Object.keys(strippedPages)[0];
                if (strippedPageId !== "-1") {
                  categoryTitle = strippedCandidateTitle;
                  // Skip the rest, we found it
                } else {
                  // Also try namespace search with stripped text
                  const strippedSearchUrl =
                    `https://${lang}.wikipedia.org/w/api.php?` +
                    new URLSearchParams({
                      action: "query",
                      list: "search",
                      srsearch: stripped,
                      srnamespace: "14",
                      srlimit: "5",
                      format: "json",
                      origin: "*",
                    }).toString();
                  const strippedSearchRes = await fetchWithTimeout(strippedSearchUrl);
                  if (strippedSearchRes.ok) {
                    const strippedSearchJson = await strippedSearchRes.json();
                    searchResults = strippedSearchJson?.query?.search;
                  }
                }
              }
            }
          } catch (_stripErr) {
            // Silently continue — we'll check searchResults below
          }
        }
      }

      // If we still don't have a categoryTitle from the stripped direct check
      if (!categoryTitle) {
        if (!searchResults || searchResults.length === 0) return empty;

        // Pick the best match (first result in category namespace)
        categoryTitle = searchResults[0].title;

        // Make sure it starts with the category prefix
        if (!categoryTitle.startsWith(categoryPrefix + ":")) {
          categoryTitle = `${categoryPrefix}:${searchResults[0].title}`;
        }
      }
    }

    // ── Step 2: Recursively traverse the category tree ──
    const traversalResult = await traverseCategory(
      categoryTitle,
      lang,
      CATEGORY_PARAMS.maxTraversalDepth
    );

    // ── Step 3: Sample articles for branch richness + fact extraction texts ──
    let avgBranchRichness = 0;
    let sampleExtractTexts: string[] = [];
    if (traversalResult.sampleArticleTitles.length > 0) {
      const sampling = await sampleArticleRichness(
        traversalResult.sampleArticleTitles,
        lang
      );
      avgBranchRichness = sampling.avgWords;
      sampleExtractTexts = sampling.extractTexts;
    }

    const result: WikipediaCategoryData = {
      found: true,
      categoryTitle,
      language: lang,
      totalArticles: traversalResult.totalArticles,
      totalSubcategories: traversalResult.totalSubcategories,
      directSubcategoryNames: traversalResult.directSubcategoryNames,
      avgBranchRichness,
      sampleExtractTexts,
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
 * Sample a set of articles from the subtree and return:
 * - Average word count (proxy for "branch richness")
 * - Raw extract texts (for fact-density extraction across the subtree)
 */
async function sampleArticleRichness(
  titles: string[],
  lang: "ro" | "en"
): Promise<{ avgWords: number; extractTexts: string[] }> {
  if (titles.length === 0) return { avgWords: 0, extractTexts: [] };

  try {
    // Batch-query FULL extracts for all sample articles at once.
    // Do NOT include `exintro` — its presence truncates to intro only.
    const url =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: titles.join("|"),
        prop: "extracts",
        explaintext: "true",
        exlimit: titles.length.toString(),
        format: "json",
        origin: "*",
      }).toString();

    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) return { avgWords: 0, extractTexts: [] };

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return { avgWords: 0, extractTexts: [] };

    let totalWords = 0;
    let count = 0;
    const extractTexts: string[] = [];

    for (const pageId of Object.keys(pages)) {
      if (pageId === "-1") continue;
      const extract: string = pages[pageId]?.extract || "";
      const words = extract.split(/\s+/).filter((w: string) => w.length > 0).length;
      totalWords += words;
      count++;
      // Keep a capped version of each extract for fact extraction
      if (extract.length > 0) {
        extractTexts.push(extract.slice(0, 15_000));
      }
    }

    return {
      avgWords: count > 0 ? Math.round(totalWords / count) : 0,
      extractTexts,
    };
  } catch (err) {
    console.error(
      `[quizzability/wikipedia] Richness sampling error:`,
      err
    );
    return { avgWords: 0, extractTexts: [] };
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
    // ── Step 1: Find the article ──
    // Strategy: try direct title lookup first, then fall back to search.
    // This fixes cases like "Istoria Europei" where the article exists
    // with the exact theme name but search might not return it.
    let pageTitle: string | null = null;

    // 1a. Try direct title lookup
    const directUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: theme,
        prop: "info",
        format: "json",
        origin: "*",
      }).toString();

    try {
      const directRes = await fetchWithTimeout(directUrl);
      if (directRes.ok) {
        const directJson = await directRes.json();
        const directPages = directJson?.query?.pages;
        if (directPages) {
          const directPageId = Object.keys(directPages)[0];
          if (directPageId !== "-1" && directPages[directPageId]?.title) {
            pageTitle = directPages[directPageId].title;
          }
        }
      }
    } catch (_directErr) {
      // Silently fall through to search
    }

    // 1b. If direct lookup failed, try search API
    if (!pageTitle) {
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
      if (!searchResults || searchResults.length === 0) {
        // 1c. Last resort: try with diacritics stripped
        const stripped = theme
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (stripped !== theme) {
          const strippedUrl =
            `https://${lang}.wikipedia.org/w/api.php?` +
            new URLSearchParams({
              action: "query",
              list: "search",
              srsearch: stripped,
              srlimit: "5",
              format: "json",
              origin: "*",
            }).toString();
          const strippedRes = await fetchWithTimeout(strippedUrl);
          if (strippedRes.ok) {
            const strippedJson = await strippedRes.json();
            const strippedResults = strippedJson?.query?.search;
            if (strippedResults && strippedResults.length > 0) {
              pageTitle = strippedResults[0].title;
            }
          }
        }
        if (!pageTitle) return empty;
      } else {
        pageTitle = searchResults[0].title;
      }
    }

    if (!pageTitle) return empty;
    const finalPageTitle: string = pageTitle;

    // ── Step 2: Fetch full article parse data ──
    const parseUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "parse",
        page: finalPageTitle,
        prop: "sections|categories|links|wikitext",
        format: "json",
        origin: "*",
      }).toString();

    const parseRes = await fetchWithTimeout(parseUrl);
    if (!parseRes.ok) return empty;

    const parseJson = await parseRes.json();
    if (parseJson.error) return empty;

    const parseData = parseJson.parse;

    // ── Step 3: Fetch FULL plain-text extract for word count & fact analysis ──
    // IMPORTANT: Do NOT include `exintro` — that MediaWiki flag is a boolean
    // whose mere presence (even as "false") restricts output to the intro
    // paragraph only. Omitting it returns the full article body.
    // Also set exchars high to avoid any server-side truncation.
    const extractUrl =
      `https://${lang}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: finalPageTitle,
        prop: "extracts|categories",
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
      title: finalPageTitle,
      language: lang,
      wordCount,
      sectionCount: sections.length,
      sectionTitles,
      categoryCount: categories.length,
      seeAlsoCount,
      linkCount,
      isDisambiguation,
      disambiguationEntries,
      extractText: extractText.slice(0, 50_000), // cap for memory — full articles can be large
      isFallback: false,
    };

    // ── Sanity check: word count vs section count ──
    // A real article with N sections should have at least ~50 words per section.
    // If this ratio is implausibly low, the extract fetch likely failed or
    // returned only a summary.
    if (sections.length > 3 && wordCount < sections.length * 50) {
      console.warn(
        `[quizzability/wikipedia] SANITY CHECK: "${pageTitle}" (${lang}) has ` +
        `${sections.length} sections but only ${wordCount} words ` +
        `(${Math.round(wordCount / Math.max(sections.length, 1))} words/section). ` +
        `Expected at least ~${sections.length * 50}. ` +
        `The extract endpoint may be returning only the intro paragraph.`
      );
    }

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
  timeoutMs: number = 12000
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
