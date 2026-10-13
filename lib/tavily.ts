// Talks to the Tavily Search API to get LIVE web and news results.
// Docs: https://docs.tavily.com/documentation/api-reference/endpoint/search
// We use plain fetch here, so there is no extra SDK to learn.

import type { Source } from "./types";

const TAVILY_URL = "https://api.tavily.com/search";

/** How far back "recent portfolio activity" is allowed to go. */
export const RECENT_DAYS = 90;

/** How many results we ask for per query. Keeps the text we send to Gemini small. */
const MAX_RESULTS_PER_QUERY = 5;

/** The shape of a single result inside Tavily's JSON response. */
type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string | null;
};

/** One search we want to run. */
type SearchPlan = {
  query: string;
  /** "news" is better for recent events, "general" for evergreen pages like blogs. */
  topic: "news" | "general";
  /** true = only keep pages published inside the last 90 days. */
  recentOnly: boolean;
};

/** Returns a date N days before `today`, formatted as "YYYY-MM-DD". */
export function daysAgo(today: Date, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Formats a Date as "YYYY-MM-DD". */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Removes characters that would break the request we send to Gemini.
 *
 * Why this is needed: an emoji is stored as TWO characters (a "surrogate pair").
 * Cutting a snippet with slice() can land in the middle of a pair and leave one
 * half behind. A half pair cannot be encoded properly, so the JSON body we send
 * becomes invalid and Gemini replies "400 Invalid JSON payload". This strips any
 * half pairs, plus control characters, which are also unsafe inside JSON.
 */
export function cleanText(raw: string): string {
  return raw
    // A high half with no low half after it.
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    // A low half with no high half before it.
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    // Control characters, which JSON does not allow raw.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim();
}

/**
 * Turns Tavily's published_date into a plain "YYYY-MM-DD" string.
 * Tavily sends dates in the long form "Mon, 28 Sep 2026 21:29:18 GMT", so we
 * cannot just cut the first 10 characters - that would give "Mon, 28 S".
 * Letting Date parse it handles both that form and a plain "2026-09-28".
 * Returns null when there is no date, or when it cannot be understood.
 */
export function normaliseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateString(parsed);
}

/**
 * Builds the 5 search queries we run in parallel.
 * Two look for recent news; three look for background material.
 */
export function buildSearchPlans(investorName: string, firmName: string): SearchPlan[] {
  return [
    {
      query: `${firmName} new investment funding round led participated`,
      topic: "news",
      recentOnly: true,
    },
    {
      query: `${firmName} portfolio company exit acquisition IPO`,
      topic: "news",
      recentOnly: true,
    },
    {
      query: `${investorName} ${firmName} investment thesis what they invest in interview`,
      topic: "general",
      recentOnly: false,
    },
    {
      query: `${investorName} ${firmName} blog post podcast LinkedIn essay`,
      topic: "general",
      recentOnly: false,
    },
    {
      query: `${firmName} controversy criticism layoffs shutdown failed portfolio company`,
      topic: "general",
      recentOnly: false,
    },
  ];
}

/** Runs ONE Tavily search and returns its raw results. Throws if Tavily rejects the call. */
async function runOneSearch(plan: SearchPlan, apiKey: string, today: Date): Promise<TavilyResult[]> {
  // Build the request body. Only the fields we actually need.
  const body: Record<string, unknown> = {
    query: plan.query,
    topic: plan.topic,
    search_depth: "basic",
    max_results: MAX_RESULTS_PER_QUERY,
    include_published_date: true, // so we can show and check dates
  };

  // For the two "recent news" searches, ask Tavily for the last 90 days only.
  if (plan.recentOnly) {
    body.start_date = daysAgo(today, RECENT_DAYS);
    body.end_date = toDateString(today);
  }

  const response = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Tavily returned ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}

/**
 * Works out which words a result must mention to count as being about this investor.
 *
 * This matters more than it sounds. Searching for "Fred Wilson" also returns pages
 * about the word "Fred" on its own - a supermarket chain, a clothing shop, the
 * Federal Reserve's economics database. Those pages are useless to the brief, and
 * several of them are dead or block visitors, so a reader clicking the link in the
 * finished brief gets an error page.
 */
function buildRelevanceWords(investorName: string, firmName: string): string[] {
  const words: string[] = [];

  const investor = investorName.trim().toLowerCase();
  if (investor) {
    words.push(investor);
    // The surname on its own, since many articles say "Wilson" after the first mention.
    const surname = investor.split(/\s+/).pop() ?? "";
    if (surname.length >= 4) words.push(surname);
  }

  const firm = firmName.trim().toLowerCase();
  if (firm) {
    words.push(firm);
    // "Union Square Ventures" should also match an article that says "Union Square".
    const withoutGenericTail = firm
      .replace(/\b(ventures?|capital|partners?|funds?|vc|llp|llc|inc|group)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (withoutGenericTail.length >= 4) words.push(withoutGenericTail);
  }

  return words;
}

/**
 * Drops results that never mention the investor or the firm.
 * If that would leave nothing at all, we keep the original list instead, so a thin
 * search still produces a brief rather than a "nothing found" error.
 */
function keepRelevant(
  results: Omit<Source, "number">[],
  investorName: string,
  firmName: string,
): Omit<Source, "number">[] {
  const words = buildRelevanceWords(investorName, firmName);
  if (words.length === 0) return results;

  const relevant = results.filter((result) => {
    const haystack = `${result.title} ${result.content}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });

  return relevant.length > 0 ? relevant : results;
}

/**
 * Runs all 5 searches IN PARALLEL, then merges them into one numbered,
 * de-duplicated source list.
 * If every single search fails we throw, so the user sees a real error
 * instead of an empty brief.
 */
export async function searchAll(
  investorName: string,
  firmName: string,
  apiKey: string,
  today: Date,
): Promise<Source[]> {
  const plans = buildSearchPlans(investorName, firmName);

  // Each search catches its own error so one bad query cannot kill the others.
  const settled = await Promise.all(
    plans.map(async (plan) => {
      try {
        return { results: await runOneSearch(plan, apiKey, today), error: null as string | null };
      } catch (error) {
        return { results: [] as TavilyResult[], error: (error as Error).message };
      }
    }),
  );

  // If literally every search failed, something is wrong with the key or the service.
  const allFailed = settled.every((s) => s.error !== null);
  if (allFailed) {
    throw new Error(settled[0].error ?? "All Tavily searches failed.");
  }

  // Flatten, drop junk, and de-duplicate by URL. Numbering comes later, because
  // irrelevant results are removed first and the numbers must stay 1, 2, 3...
  const seenUrls = new Set<string>();
  const collected: Omit<Source, "number">[] = [];

  for (const result of settled.flatMap((s) => s.results)) {
    const url = result.url?.trim();
    const title = result.title?.trim();
    if (!url || !title || seenUrls.has(url)) continue;

    seenUrls.add(url);
    collected.push({
      title: cleanText(title),
      url,
      publishedDate: normaliseDate(result.published_date),
      // Trim long snippets so the prompt stays a reasonable size, then clean up
      // any half-emoji the cut may have left behind.
      content: cleanText((result.content ?? "").slice(0, 1200)),
    });
  }

  // Keep only results that actually mention this investor or firm, then number them.
  const relevant = keepRelevant(collected, investorName, firmName);
  return relevant.map((source, index) => ({ ...source, number: index + 1 }));
}
