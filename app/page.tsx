"use client";

// The home page. It holds the form values, calls POST /api/brief, and then shows
// either a loading state, an error, or the finished brief.

import { useEffect, useState } from "react";
import BriefForm from "./components/BriefForm";
import BriefView from "./components/BriefView";
import LoadingProgress from "./components/LoadingProgress";
import type { BriefRequest, BriefResponse } from "@/lib/types";

// The case study says Priya "runs a D2C startup", so the sector below just restates
// that. It then requires the talking points to be tailored to her STAGE as well, but
// never says what her stage is - so "Seed" is an editable starting assumption.
// The description starts EMPTY on purpose: the case study says nothing about her
// product, so the app shows an example as placeholder text rather than inventing one.
const DEFAULT_FORM: BriefRequest = {
  investorName: "",
  firmName: "",
  startupSector: "D2C / Consumer brands",
  startupStage: "Seed",
  startupDescription: "",
};

/** Where the startup profile is kept in the browser. */
const PROFILE_KEY = "investor-brief:startup-profile";

/** One-click examples, so the app is not a blank box on first visit. */
const EXAMPLES = [
  { investorName: "Fred Wilson", firmName: "Union Square Ventures" },
  { investorName: "Anirudh Damani", firmName: "Artha Venture Fund" },
  { investorName: "Vaibhav Domkundwar", firmName: "Better Capital" },
];

/** What the finished brief contains. Shown before the first search. */
const SECTIONS_PREVIEW = [
  {
    step: "1",
    title: "Recent Portfolio Activity",
    text: "New investments and exits from the last 90 days, with dates and source links.",
  },
  {
    step: "2",
    title: "Investment Thesis",
    text: "The sectors, stages and beliefs they state publicly, in their own words.",
  },
  {
    step: "3",
    title: "Context & Red Flags",
    text: "Controversies, pivots, and sectors they have quietly moved away from.",
  },
  {
    step: "4",
    title: "Three Talking Points",
    text: "Openers that connect their real interests to your sector and stage.",
  },
];

export default function HomePage() {
  const [form, setForm] = useState<BriefRequest>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResponse | null>(null);

  // Remember who the brief was about, so the heading stays correct even if the
  // user starts typing a new name into the form.
  const [shownFor, setShownFor] = useState({ investorName: "", firmName: "" });

  // Load the saved startup profile once, after the page appears in the browser.
  // This has to happen in an effect rather than in useState: localStorage does not
  // exist on the server, and reading it during the first render would make the
  // server HTML and the browser HTML disagree (a "hydration mismatch").
  // The lint rule below normally warns about setState in an effect; restoring saved
  // data on mount is the accepted exception, and it runs once because the
  // dependency list is empty.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return;
      const profile = JSON.parse(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring saved profile on mount
      setForm((current) => ({ ...current, ...profile }));
    } catch {
      // A browser with storage blocked just keeps the defaults. Not a problem.
    }
  }, []);

  /** Saves just the startup profile fields, not the investor being searched. */
  function rememberProfile(values: BriefRequest) {
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          startupSector: values.startupSector,
          startupStage: values.startupStage,
          startupDescription: values.startupDescription,
        }),
      );
    } catch {
      // If storage is blocked we simply do not remember it.
    }
  }

  function handleFormChange(values: BriefRequest) {
    setForm(values);
    rememberProfile(values);
  }

  /** Fills the investor and firm from one of the example buttons. */
  function fillFromExample(example: { investorName: string; firmName: string }) {
    setForm((current) => ({ ...current, ...example }));
    setError(null);
  }

  async function handleGenerate() {
    // Basic check in the browser before we bother the server.
    if (!form.investorName.trim() || !form.firmName.trim()) {
      setError("Please enter both an investor name and a firm name.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // The server always replies with JSON, including for errors.
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data as BriefResponse);
      setShownFor({ investorName: form.investorName, firmName: form.firmName });
    } catch {
      // This runs if the network call itself failed (offline, server down, timeout).
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
      {/* --- Page header --- */}
      <header className="no-print mb-7 text-center sm:mb-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-600/15 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            {/* A gentle pulsing dot, to suggest "live". */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
          </span>
          Live web search + Gemini Flash
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Walk in knowing
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            who you are pitching
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          Enter an investor and their firm. Get a sourced briefing — recent deals, what they
          say they invest in, the red flags, and three openers tailored to your startup.
        </p>

        {/* Three small facts that set expectations before the first search. */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <span>Under 2 minutes</span>
          <span className="h-3 w-px bg-zinc-300" aria-hidden="true" />
          <span>Last 90 days of activity</span>
          <span className="h-3 w-px bg-zinc-300" aria-hidden="true" />
          <span>Every claim linked to a source</span>
        </div>
      </header>

      {/* --- The form --- */}
      <div className="no-print mb-5">
        <BriefForm
          values={form}
          onChange={handleFormChange}
          onSubmit={handleGenerate}
          isLoading={isLoading}
        />
      </div>

      {/* --- Example buttons, so the page is never a blank box --- */}
      {!result && !isLoading && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-zinc-500">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.investorName}
              type="button"
              onClick={() => fillFromExample(example)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {example.investorName}
              <span className="text-zinc-400"> · {example.firmName}</span>
            </button>
          ))}
        </div>
      )}

      {/* --- Error message, if any --- */}
      {error && (
        <div className="no-print mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
          <p className="text-sm font-semibold text-rose-900">Could not generate the brief</p>
          <p className="mt-1 text-sm leading-relaxed text-rose-800">{error}</p>
        </div>
      )}

      {/* --- Loading state --- */}
      {isLoading && (
        <div className="no-print mb-5">
          <LoadingProgress />
        </div>
      )}

      {/* --- The finished brief --- */}
      {result && !isLoading && (
        <BriefView
          data={result}
          investorName={shownFor.investorName}
          firmName={shownFor.firmName}
        />
      )}

      {/* --- What the brief contains. Only before the first search. --- */}
      {!result && !isLoading && !error && (
        <section className="no-print mt-10">
          <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            What you get
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {SECTIONS_PREVIEW.map((section) => (
              <div
                key={section.step}
                className="rounded-xl border border-zinc-200/70 bg-white/70 p-4 transition hover:border-indigo-200 hover:bg-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                    {section.step}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">{section.title}</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">{section.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Plus a numbered source list, and an honest confidence rating when the web has
            little to say about an investor.
          </p>
        </section>
      )}

      {/* --- Footer --- */}
      <footer className="no-print mt-12 border-t border-zinc-200 pt-5 text-xs leading-relaxed text-zinc-500">
        Live web search by Tavily · Written by Google Gemini Flash · Always verify facts before
        the meeting.
      </footer>
    </main>
  );
}
