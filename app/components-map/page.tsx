"use client";

// A public page that draws the architecture diagram (the "Components Map").
// Mermaid is loaded from a CDN, so there is no extra npm package to install.
// The same diagram text also lives in docs/components-map.md and in the README.

import Script from "next/script";
import Link from "next/link";

// The diagram, written in Mermaid's flowchart syntax.
const DIAGRAM = `flowchart TD
    U["Priya - Founder<br/>Browser"]
    FE["Next.js Frontend<br/>app/page.tsx + components"]
    API["API Route<br/>app/api/brief/route.ts"]
    TAV["Tavily Search API<br/>5 queries in parallel"]
    GEM["Google Gemini Flash<br/>gemini-3.8-flash"]

    U -->|"investor name, firm name,<br/>sector, stage, description"| FE
    FE -->|"POST /api/brief<br/>JSON form data"| API
    API -->|"5 search queries at once<br/>2 of them limited to last 90 days"| TAV
    TAV -->|"titles, URLs, published dates,<br/>content snippets"| API
    API -->|"today's date, numbered sources,<br/>her sector and stage, JSON schema"| GEM
    GEM -->|"structured JSON brief, talking points<br/>tailored to her sector and stage"| API
    API -->|"brief + numbered sources<br/>+ generation time"| FE
    FE -->|"4 section cards, sources list,<br/>copy and print buttons"| U`;

export default function ComponentsMapPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Components Map
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          How a request flows through the Pre-Meeting Investor Brief agent. Each arrow is labelled
          with the data that travels along it.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          Back to the app
        </Link>
      </header>

      {/* Mermaid replaces the contents of this element with an SVG diagram. */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-8">
        <pre className="mermaid flex justify-center">{DIAGRAM}</pre>
      </div>

      {/* A plain-text fallback, so the page still explains itself if the CDN is blocked. */}
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">The same flow in words</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          <li>Priya fills in the investor, the firm, and her startup profile in the browser.</li>
          <li>
            The frontend sends that as JSON to <code className="text-xs">POST /api/brief</code>.
          </li>
          <li>
            The route validates the input, then fires 5 Tavily searches at the same time. Two are
            restricted to the last 90 days for recent investments and exits.
          </li>
          <li>
            Results are merged, de-duplicated by URL, and numbered into one source list.
          </li>
          <li>
            That list, today&apos;s date, and her sector and stage go to Gemini Flash with a
            strict JSON schema, so the model must fill a fixed structure, cite each fact by
            source number, and write the three talking points for her sector and stage.
          </li>
          <li>
            The route returns the brief, the sources and the generation time; the frontend shows
            them as cards.
          </li>
        </ol>
      </section>

      {/*
        Load Mermaid from the CDN, then render the diagram.
        We use startOnLoad: false and call run() ourselves, because this script
        finishes loading after the page has already been drawn.
      */}
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@12.1.0/dist/mermaid.min.js"
        strategy="afterInteractive"
        onReady={() => {
          const mermaid = (window as unknown as { mermaid?: MermaidApi }).mermaid;
          if (!mermaid) return;
          mermaid.initialize({ startOnLoad: false, theme: "neutral" });
          mermaid.run();
        }}
      />
    </main>
  );
}

/** The small part of Mermaid's API that we actually use. */
type MermaidApi = {
  initialize: (config: { startOnLoad: boolean; theme: string }) => void;
  run: () => void;
};
