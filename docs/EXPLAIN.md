# EXPLAIN.md — the whole system in simple language

This file is written for one purpose: so you can explain every part of this project
yourself. No jargon without a definition.

---

## 1. The idea in three sentences

Priya is about to meet an investor. She types in the investor's name and firm, the app
searches the live internet for what that investor has been doing and saying, and then
Google's Gemini Flash model reads those search results and writes a short briefing.
The app never lets the model make things up — it can only use what the search just found.

---

## 2. The journey of one request

Imagine Priya clicks **Generate brief**. Here is every step, in order.

**Step 1 — The browser collects the form.**
`app/page.tsx` is holding the form values in React state. When she clicks the button,
it sends them as JSON to `/api/brief` using `fetch`.

**Step 2 — The server checks the keys exist.**
`app/api/brief/route.ts` starts by reading `process.env.GEMINI_API_KEY` and
`process.env.TAVILY_API_KEY`. If either is missing it returns a friendly message
immediately, so you never see a blank screen.

**Step 3 — The server validates the input.**
Investor name and firm name must both be present and under 120 characters. The three
startup fields fall back to defaults if they arrive empty.

**Step 4 — Five live searches run at the same time.**
`lib/tavily.ts` builds five different queries and sends them all at once with
`Promise.all`. Running them together means the whole search stage takes about as long
as the single slowest query, instead of all five added up.

The five queries are:

| # | What it looks for | Date filter |
| --- | --- | --- |
| 1 | New funding rounds the firm led or joined | Last 90 days |
| 2 | Exits, acquisitions, IPOs in the portfolio | Last 90 days |
| 3 | Investment thesis, interviews | None |
| 4 | Blog posts, podcasts, LinkedIn essays | None |
| 5 | Controversies, layoffs, shutdowns, failures | None |

Queries 1 and 2 feed **section 1** of the brief, which must only cover the last 90 days,
so they carry `start_date` and `end_date`. Queries 3–5 feed sections 2 and 3, which are
about long-term beliefs and history, so limiting them by date would hurt.

**Step 5 — Results are merged and numbered.**
All five result sets are flattened into one list. Any URL seen twice is dropped
(de-duplication). What survives is numbered `[1]`, `[2]`, `[3]`… and each snippet is cut
to 1200 characters so the prompt stays a reasonable size.

**Step 6 — The prompt is built.**
`lib/prompt.ts` glues together: today's date, the computed 90-day cutoff date, the
investor and firm, Priya's startup profile, eight hard rules, and the numbered source
list.

**Step 7 — Gemini Flash writes the brief.**
`lib/gemini.ts` calls Google's official SDK. The important part is `response_format`: it
carries a **JSON schema**, which is a description of the exact shape the answer must
have. Because of it, Gemini cannot reply with an essay — it must fill in our fields.

**Step 8 — The answer goes back to the browser.**
The route returns the brief, the numbered sources (taken from the *real* Tavily results,
not from the model), today's date, and how many seconds the whole thing took.

**Step 9 — The page draws it.**
`BriefView.tsx` renders four cards plus the sources list, and offers "Copy brief" and
"Download as PDF".

---

## 3. File by file

### `lib/types.ts`
Just TypeScript type definitions — no logic. A "type" is a description of the shape of
some data. Having them in one file means the frontend and the backend agree on exactly
what a `Brief` looks like, and the editor warns you if you mistype a field name.

### `lib/tavily.ts`
Everything to do with live search.

- `RECENT_DAYS = 90` — the window for section 1, in one constant.
- `daysAgo()` / `toDateString()` — tiny date helpers that produce `"YYYY-MM-DD"`.
- `buildSearchPlans()` — returns the five queries described above.
- `runOneSearch()` — sends one POST request to `https://api.tavily.com/search` with the
  API key in an `Authorization: Bearer ...` header. Throws if Tavily replies with an error.
- `searchAll()` — runs all five with `Promise.all`, wrapping each one in a `try/catch`
  so a single failing query cannot kill the rest. If **every** query fails, it throws, so
  a bad API key surfaces as a real error rather than a silently empty brief. Then it
  flattens, de-duplicates by URL, and numbers the results.

### `lib/prompt.ts`
Builds one long string. `formatSources()` turns each source into four labelled lines
(number, title, URL, published date, snippet). `buildPrompt()` wraps those in the rules.
The rules are the anti-hallucination layer, so they are worth reading closely.

### `lib/gemini.ts`
- `GEMINI_MODEL = "gemini-3.8-flash"` — the model name, in one constant, exactly as the
  assignment asked, so swapping models is a one-line change.
- `BRIEF_SCHEMA` — the JSON schema. Each section is listed in `required`, so the model
  cannot skip one.
- `generateBrief()` — creates the client, calls `ai.interactions.create(...)` with the
  schema, reads `interaction.output_text`, and `JSON.parse`s it. Both failure modes
  (empty response, unparseable text) throw a clear message.

This is the **only** file in the project that calls an AI model, and it only ever calls
Google Gemini.

### `app/api/brief/route.ts`
The pipeline, in the order described in section 2. Note three things:

- `export const maxDuration = 120` tells Vercel this function may run for up to 120
  seconds. Vercel's free Hobby plan allows up to 300, so we are well inside it, and 120
  matches the assignment's two-minute goal.
- Each failure returns a *different* friendly message with a sensible HTTP status, so
  you can tell a missing key (500) from a search failure (502) from no results (404).
- `generationSeconds` is measured on the server with `Date.now()`.

### `app/page.tsx`
A client component (`"use client"`) because it uses React state and event handlers. It
holds the form values, the loading flag, the error message and the result. `shownFor`
remembers which investor the displayed brief is about, so the heading stays correct even
if Priya starts typing a new name.

### `app/components/BriefForm.tsx`
The form. `setField()` updates one field while copying the rest, which is the standard
React pattern for editing an object in state. Every input is disabled while loading.

### `app/components/LoadingProgress.tsx`
A `setInterval` ticks once a second. The message shown is the last one whose `after`
threshold the elapsed time has passed, so the text changes as time goes on. The
`return () => clearInterval(timer)` inside `useEffect` is the cleanup — without it the
timer would keep running after the component disappears.

### `app/components/BriefView.tsx`
Renders the four sections. `briefToText()` flattens the brief into plain text for the
"Copy brief" button. `handlePrint()` just calls `window.print()`.

### `app/components/SectionCard.tsx` and `SourceLink.tsx`
Two tiny reusable pieces: the white card with a numbered heading, and the small
domain-name link shown under each claim.

### `app/globals.css`
Tailwind plus a `@media print` block. `.no-print` hides the form and buttons when
printing; `.print-url::after` uses the CSS `attr(href)` trick to print the real URL next
to each link, because a link in a PDF is not clickable in the way a link on screen is.

### `app/components-map/page.tsx`
The architecture diagram as a public page. Mermaid is loaded from a CDN with Next's
`<Script>` component, and we call `mermaid.run()` ourselves in `onReady` rather than
using Mermaid's `startOnLoad`, because the script finishes loading *after* the page has
already been drawn. There is also a written fallback, so the page still explains itself
if the CDN is blocked.

---

## 4. Ten likely viva questions, with short answers

**1. Why do you use Tavily instead of just asking Gemini?**
Gemini only knows what was in its training data, which has a cutoff date and no sources.
The assignment requires live data and 90-day recency, so the facts must come from a
search at request time. Tavily returns titles, URLs, published dates and clean text
snippets in one call, so there is no HTML scraping to write.

**2. How do you stop the model from hallucinating?**
Five layers. The model only sees text Tavily fetched seconds ago. The prompt forbids
outside knowledge and forbids inventing dates, numbers or quotes. Today's date and the
90-day cutoff are passed in explicitly. Every claim must carry a URL copied from the
source list. And the Sources list shown on screen is built in the API route from the
real Tavily results, not from the model's output — so even a fabricated URL inside a
claim cannot corrupt the bibliography.

**3. Why pass today's date into the prompt?**
A language model has no reliable sense of what today is. Without being told, it cannot
judge whether something falls inside a 90-day window. The route computes both today's
date and the cutoff date and writes them into the prompt as literal strings.

**4. Why a JSON schema instead of just asking for JSON in the prompt?**
Asking politely in a prompt is a request; a schema is a constraint enforced by the API.
With a schema, every required section is guaranteed to be present and correctly typed,
so the frontend can render fields directly with no parsing, no regex and no retry logic.

**5. Why five searches, and why in parallel?**
No single query covers recent deals, stated beliefs and controversies at once. The five
are independent of each other, so `Promise.all` runs them simultaneously; the stage then
costs roughly the slowest query rather than the sum of all five, which is what keeps the
whole pipeline well under two minutes.

**6. What happens if a search fails, or the investor is obscure?**
Each query is individually wrapped in `try/catch` and returns an empty list on failure,
so four good queries still produce a brief. If *all* five fail, the route throws and
returns a 502 with a readable message. If the searches succeed but find nothing, the
route returns a 404 asking the user to check the spelling. If results are thin, the
model is instructed to set `dataConfidence` to `low` and say so, rather than inventing
material.

**7. Where are the API keys, and how do you know they are safe?**
In environment variables, `GEMINI_API_KEY` and `TAVILY_API_KEY`. They are read only
inside `app/api/brief/route.ts`, which runs on the server. Neither name starts with
`NEXT_PUBLIC_`, which is the prefix Next.js requires before a variable is exposed to the
browser, so they are never in the client bundle. `.env.local` is git-ignored;
`.env.example` holds placeholder names only.

**8. Why `maxDuration = 120`?**
Vercel terminates a function that runs past its maximum duration. The Hobby plan allows
up to 300 seconds, and the assignment's goal is two minutes, so 120 is a ceiling that
fits both. Real runs take about 15–40 seconds, so there is a lot of headroom.

**9. How does the "Download as PDF" button work without a PDF library?**
It calls `window.print()`, which opens the browser's own print dialog, where "Save as
PDF" is a standard destination. A `@media print` block in `globals.css` hides the form
and buttons, flattens the cards, and prints the real URL after each link. Zero
dependencies.

**10. Why does the form ask about Priya's own startup?**
Because section 4 must be *tailored to her stage and sector*, and the problem statement
never specifies them. The app asks for sector, stage and a one-line description, and
pre-fills a sensible D2C example that stays editable. Those three values go into the
prompt, which is what lets the talking points connect the investor's actual stated
interests to her specific situation.

---

## 5. If an examiner asks you to change something live

| "Change the model" | `GEMINI_MODEL` in `lib/gemini.ts`, one line. |
| --- | --- |
| "Make it 30 days, not 90" | `RECENT_DAYS` in `lib/tavily.ts`, one line. |
| "Add a sixth search" | Add an entry to `buildSearchPlans()` in `lib/tavily.ts`. |
| "Add a field to the brief" | Add it to `BRIEF_SCHEMA` in `lib/gemini.ts`, to `Brief` in `lib/types.ts`, and render it in `BriefView.tsx`. |
| "Tighten the rules" | The numbered rules in `lib/prompt.ts`. |
| "More search results each" | `MAX_RESULTS_PER_QUERY` in `lib/tavily.ts`. |
