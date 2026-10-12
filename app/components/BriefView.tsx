"use client";

// Displays the finished brief: the four required sections plus the sources list,
// with "Copy brief" and "Download as PDF" buttons.

import { useState } from "react";
import SectionCard from "./SectionCard";
import SourceLink from "./SourceLink";
import type { BriefResponse } from "@/lib/types";

type Props = {
  data: BriefResponse;
  investorName: string;
  firmName: string;
};

/** Turns the brief into plain text so the "Copy brief" button can put it on the clipboard. */
function briefToText(data: BriefResponse, investorName: string, firmName: string): string {
  const { brief, sources } = data;
  const lines: string[] = [];

  lines.push(`PRE-MEETING INVESTOR BRIEF: ${investorName} - ${firmName}`);
  lines.push(`Generated on ${data.generatedOn} in ${data.generationSeconds}s`);
  lines.push("");
  lines.push(brief.summary);
  lines.push("");

  lines.push("1. RECENT PORTFOLIO ACTIVITY (last 90 days)");
  lines.push(brief.recentActivity.note);
  for (const item of brief.recentActivity.items) {
    lines.push(`- [${item.date}] ${item.headline}: ${item.description} (${item.sourceUrl})`);
  }
  lines.push("");

  lines.push("2. INVESTMENT THESIS");
  lines.push(`Sectors: ${brief.investmentThesis.sectors.join(", ") || "not stated in sources"}`);
  lines.push(`Stages: ${brief.investmentThesis.stages.join(", ") || "not stated in sources"}`);
  for (const belief of brief.investmentThesis.beliefs) {
    lines.push(`- ${belief.point} (${belief.sourceUrl})`);
  }
  lines.push("");

  lines.push("3. CONTEXT & RED FLAGS");
  lines.push(brief.contextAndRedFlags.note);
  for (const item of brief.contextAndRedFlags.items) {
    lines.push(`- ${item.point} (${item.sourceUrl})`);
  }
  lines.push("");

  lines.push("4. THREE TALKING POINTS");
  brief.talkingPoints.forEach((tp, i) => {
    lines.push(`${i + 1}. ${tp.point}`);
    lines.push(`   Why: ${tp.why}`);
  });
  lines.push("");

  lines.push(`Data confidence: ${brief.dataConfidence} - ${brief.confidenceNote}`);
  lines.push("");

  lines.push("SOURCES");
  for (const source of sources) {
    const date = source.publishedDate ? ` (${source.publishedDate})` : "";
    lines.push(`[${source.number}] ${source.title}${date} - ${source.url}`);
  }

  return lines.join("\n");
}

export default function BriefView({ data, investorName, firmName }: Props) {
  const { brief, sources } = data;
  const [copied, setCopied] = useState(false);

  // Copies the plain-text brief to the clipboard and shows "Copied!" for 2 seconds.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(briefToText(data, investorName, firmName));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Your browser blocked clipboard access. Please select the text and copy it manually.");
    }
  }

  // The browser's own print dialog. Choosing "Save as PDF" there gives a PDF,
  // so we do not need any PDF library.
  function handlePrint() {
    window.print();
  }

  // Colour the confidence badge: green for high, amber for medium, red for low.
  const confidenceColour = {
    high: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-red-100 text-red-800",
  }[brief.dataConfidence];

  const buttonClass =
    "rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50";

  return (
    <div className="space-y-5">
      {/* --- Header: who, when, how long, and the action buttons --- */}
      <div className="print-card rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
              {investorName}
              <span className="font-normal text-zinc-500"> · {firmName}</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Generated on {data.generatedOn} in {data.generationSeconds}s · {sources.length} live
              sources
            </p>
          </div>

          <div className="no-print flex gap-2">
            <button type="button" onClick={handleCopy} className={buttonClass}>
              {copied ? "Copied!" : "Copy brief"}
            </button>
            <button type="button" onClick={handlePrint} className={buttonClass}>
              Download as PDF
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{brief.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceColour}`}>
            Data confidence: {brief.dataConfidence}
          </span>
          <span className="text-xs text-zinc-500">{brief.confidenceNote}</span>
        </div>
      </div>

      {/* --- Section 1: Recent portfolio activity --- */}
      <SectionCard step="1" title="Recent Portfolio Activity (last 90 days)">
        <p className="mb-4 text-sm text-zinc-600">{brief.recentActivity.note}</p>

        {brief.recentActivity.items.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            No investments or exits from the last 90 days appeared in the live search results.
          </p>
        ) : (
          <ul className="space-y-4">
            {brief.recentActivity.items.map((item, i) => (
              <li key={i} className="border-l-2 border-zinc-900 pl-4">
                <p className="text-sm font-semibold text-zinc-900">{item.headline}</p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{item.date}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{item.description}</p>
                <div className="mt-1.5">
                  <SourceLink url={item.sourceUrl} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* --- Section 2: Investment thesis --- */}
      <SectionCard step="2" title="Investment Thesis">
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Sectors
            </p>
            {brief.investmentThesis.sectors.length === 0 ? (
              <p className="text-sm text-zinc-500">Not stated in the sources.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {brief.investmentThesis.sectors.map((sector, i) => (
                  <span key={i} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                    {sector}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Stages
            </p>
            {brief.investmentThesis.stages.length === 0 ? (
              <p className="text-sm text-zinc-500">Not stated in the sources.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {brief.investmentThesis.stages.map((stage, i) => (
                  <span key={i} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                    {stage}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-3">
          {brief.investmentThesis.beliefs.map((belief, i) => (
            <li key={i} className="text-sm leading-relaxed text-zinc-700">
              {belief.point} <SourceLink url={belief.sourceUrl} />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* --- Section 3: Context and red flags --- */}
      <SectionCard step="3" title="Context & Red Flags">
        <p className="mb-4 text-sm text-zinc-600">{brief.contextAndRedFlags.note}</p>

        {brief.contextAndRedFlags.items.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            Nothing notable showed up in the live search results.
          </p>
        ) : (
          <ul className="space-y-3">
            {brief.contextAndRedFlags.items.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed text-zinc-700">
                {item.point} <SourceLink url={item.sourceUrl} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* --- Section 4: Three talking points --- */}
      <SectionCard step="4" title="Three Talking Points">
        <ol className="space-y-4">
          {brief.talkingPoints.map((tp, i) => (
            <li key={i} className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-medium leading-relaxed text-zinc-900">
                {i + 1}. {tp.point}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                <span className="font-semibold">Why this works:</span> {tp.why}
              </p>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* --- Sources: built from the real Tavily results, not from the model --- */}
      <SectionCard title="Sources">
        <ol className="space-y-2.5">
          {sources.map((source) => (
            <li key={source.number} className="text-sm">
              <span className="mr-1.5 font-mono text-xs text-zinc-400">[{source.number}]</span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="print-url text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
              >
                {source.title}
              </a>
              {source.publishedDate && (
                <span className="ml-1.5 text-xs text-zinc-500">({source.publishedDate})</span>
              )}
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
