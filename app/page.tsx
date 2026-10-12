"use client";

// The home page. It holds the form values, calls POST /api/brief,
// and then shows either a loading state, an error, or the finished brief.

import { useState } from "react";
import Link from "next/link";
import BriefForm from "./components/BriefForm";
import BriefView from "./components/BriefView";
import LoadingProgress from "./components/LoadingProgress";
import type { BriefRequest, BriefResponse } from "@/lib/types";

// Priya's startup is not described in the assignment, so we pre-fill a sensible
// D2C example. She can edit any of it; it is what makes the talking points specific.
const DEFAULT_FORM: BriefRequest = {
  investorName: "",
  firmName: "",
  startupSector: "D2C / Consumer brands",
  startupStage: "Seed",
  startupDescription: "A direct-to-consumer skincare brand selling online across India.",
};

export default function HomePage() {
  const [form, setForm] = useState<BriefRequest>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefResponse | null>(null);

  // Remember who the brief was about, so the heading stays correct even if the
  // user starts typing a new name into the form.
  const [shownFor, setShownFor] = useState({ investorName: "", firmName: "" });

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
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* --- Page header --- */}
      <header className="no-print mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Pre-Meeting Investor Brief
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Enter an investor and their firm. The app searches the live web, then uses Google Gemini
          Flash to write a sourced briefing you can read before the meeting.
        </p>
        <Link
          href="/components-map"
          className="mt-3 inline-block text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          View the components map
        </Link>
      </header>

      {/* --- The form --- */}
      <div className="no-print mb-6">
        <BriefForm
          values={form}
          onChange={setForm}
          onSubmit={handleGenerate}
          isLoading={isLoading}
        />
      </div>

      {/* --- Error message, if any --- */}
      {error && (
        <div className="no-print mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Could not generate the brief</p>
          <p className="mt-1 text-sm leading-relaxed text-red-800">{error}</p>
        </div>
      )}

      {/* --- Loading state --- */}
      {isLoading && (
        <div className="no-print mb-6">
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
      <footer className="no-print mt-10 border-t border-zinc-200 pt-5 text-xs text-zinc-500">
        Live web search by Tavily · Written by Google Gemini Flash · Always verify facts before
        the meeting.
      </footer>
    </main>
  );
}
