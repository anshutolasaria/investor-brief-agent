// Builds the single text prompt we send to Gemini.
// Keeping it in its own file makes it easy to read and tweak without touching the API code.

import type { BriefRequest, Source } from "./types";
import { RECENT_DAYS, daysAgo, toDateString } from "./tavily";

/**
 * Turns the numbered source list into plain text that Gemini can read.
 * Each source keeps its number so the model can refer back to it.
 */
function formatSources(sources: Source[]): string {
  return sources
    .map(
      (s) =>
        `[${s.number}] TITLE: ${s.title}\n` +
        `    URL: ${s.url}\n` +
        `    PUBLISHED: ${s.publishedDate ?? "unknown"}\n` +
        `    SNIPPET: ${s.content}`,
    )
    .join("\n\n");
}

/**
 * Builds the full prompt: the rules, today's date, the startup profile,
 * and the live sources we just fetched from Tavily.
 */
export function buildPrompt(input: BriefRequest, sources: Source[], today: Date): string {
  const todayString = toDateString(today);
  const cutoffString = daysAgo(today, RECENT_DAYS);

  return `You are a research analyst preparing a pre-meeting briefing for a startup founder.

TODAY'S DATE IS: ${todayString}
THE LAST ${RECENT_DAYS} DAYS MEANS: any date from ${cutoffString} up to ${todayString}.

THE INVESTOR BEING RESEARCHED
Investor name: ${input.investorName}
Firm: ${input.firmName}

THE FOUNDER YOU ARE WRITING FOR
Her name is Priya. Her startup:
- Sector: ${input.startupSector}
- Stage: ${input.startupStage}
- What they do: ${input.startupDescription}

RULES YOU MUST FOLLOW
1. Use ONLY the numbered sources below. Do not use anything you remember from training.
2. Never invent an investment, a date, a company name, a number or a quote. If the sources
   do not say it, leave it out.
3. For "recentActivity", only include an item if the source clearly shows it happened
   between ${cutoffString} and ${todayString}. If a source has no usable date, or the date is
   older than ${cutoffString}, DO NOT list it as recent activity.
4. If you find no qualifying recent activity, set "found" to false, leave "items" empty,
   and write an honest one-line explanation in "note". Do not guess to fill space.
5. Every factual claim must carry the NUMBER of the source it came from, as a plain
   number. Source [3] means "sourceNumber": 3. Never write out a URL anywhere: the app
   already holds the real URL for each number and will attach it for you. Only use
   numbers that actually appear in the list below.
6. Do NOT write bracket markers like [3] or [10, 12] inside any piece of text. The app
   adds the source link itself from the "sourceNumber" field. Text fields such as
   "summary", "sectors" and "point" must read as clean prose with no citation markers.
7. For "investmentThesis", capture what they PUBLICLY STATE they invest in: the sectors
   and stages they name, and the beliefs they express in their own interviews, essays,
   blog posts or podcasts.
8. For "contextAndRedFlags", look specifically for: sectors this investor or firm has
   moved away from or stopped backing, notable controversies, and pivots or failures
   among their portfolio companies. If the sources show none of these, say so plainly in
   "note" and leave "items" empty rather than padding it with neutral facts.
9. The three talking points must connect this investor's ACTUAL stated interests
   (from the sources) to Priya's sector (${input.startupSector}) and stage
   (${input.startupStage}). Each should be something she can say out loud in the first
   two minutes of the meeting.
10. Be honest about thin data. If this investor is not well covered by the sources, say so
   plainly in "confidenceNote" and set "dataConfidence" to "low".
11. Write in clear, plain English. No marketing language.

NUMBERED SOURCES (live web and news results fetched today)
${sources.length > 0 ? formatSources(sources) : "(No sources were found.)"}

Now produce the briefing as JSON matching the required schema.`;
}
