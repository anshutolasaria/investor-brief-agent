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

  // Flatten, drop junk, and de-duplicate by URL.
  const seenUrls = new Set<string>();
  const sources: Source[] = [];

  for (const result of settled.flatMap((s) => s.results)) {
    const url = result.url?.trim();
    const title = result.title?.trim();
    if (!url || !title || seenUrls.has(url)) continue;

    seenUrls.add(url);
    sources.push({
      number: sources.length + 1, // numbering starts at 1
      title,
      url,
      publishedDate: result.published_date ? result.published_date.slice(0, 10) : null,
      // Trim long snippets so the prompt we send to Gemini stays a reasonable size.
      content: (result.content ?? "").slice(0, 1200),
    });
  }

  return sources;
}
