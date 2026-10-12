"use client";

// The home page. It holds the form values, calls POST /api/brief, and then shows
// either a loading state, an error, or the finished brief.

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <header className="no-print mb-7">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Live web search + Gemini Flash
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Pre-Meeting Investor Brief
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          Enter an investor and their firm. You get a sourced briefing — their recent deals,
          what they say they invest in, the red flags, and three openers tailored to your
          startup — in under two minutes.
        </p>

        <Link
          href="/components-map"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-4 hover:decoration-indigo-500"
        >
          View the components map →
        </Link>
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

      {/* --- Footer --- */}
      <footer className="no-print mt-12 border-t border-zinc-200 pt-5 text-xs leading-relaxed text-zinc-500">
        Live web search by Tavily · Written by Google Gemini Flash · Always verify facts before
        the meeting.
      </footer>
    </main>
  );
}
