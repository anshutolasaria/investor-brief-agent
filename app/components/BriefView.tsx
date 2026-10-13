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

  // Looks up the real URL for a source number. Returns "" if the number is unknown.
  const urlFor = (n: number) => sources.find((s) => s.number === n)?.url ?? "";

  lines.push(`PRE-MEETING INVESTOR BRIEF: ${investorName} - ${firmName}`);
  lines.push(`Generated on ${data.generatedOn} in ${data.generationSeconds}s`);
  lines.push("");
  lines.push(brief.summary);
  lines.push("");

  lines.push("1. RECENT PORTFOLIO ACTIVITY (last 90 days)");
  lines.push(brief.recentActivity.note);
  for (const item of brief.recentActivity.items) {
    lines.push(`- ${item.date} — ${item.headline}`);
    lines.push(`  ${item.description}`);
    lines.push(`  ${urlFor(item.sourceNumber)}`);
  }
  lines.push("");

  lines.push("2. INVESTMENT THESIS");
  lines.push(`Sectors: ${brief.investmentThesis.sectors.join(", ") || "not stated in sources"}`);
  lines.push(`Stages: ${brief.investmentThesis.stages.join(", ") || "not stated in sources"}`);
  for (const belief of brief.investmentThesis.beliefs) {
    lines.push(`- ${belief.point}`);
    lines.push(`  ${urlFor(belief.sourceNumber)}`);
  }
  lines.push("");

  lines.push("3. CONTEXT & RED FLAGS");
  lines.push(brief.contextAndRedFlags.note);
  for (const item of brief.contextAndRedFlags.items) {
    lines.push(`- ${item.point}`);
    lines.push(`  ${urlFor(item.sourceNumber)}`);
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
    const date = source.publishedDate ? ` — ${source.publishedDate}` : "";
    lines.push(`[${source.number}] ${source.title}${date}`);
    // The address goes on its own line with nothing after it, so that pasting into
    // chat apps, email or Word turns the whole thing into a working link.
    lines.push(`    ${source.url}`);
  }

  return lines.join("\n");
}

/**
 * Older fallback for copying: put the text in a hidden textarea, select it, and use
 * the old copy command. Needed because some browsers block the modern clipboard API.
 * Returns true if the copy worked.
 */
function copyUsingHiddenTextarea(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const worked = document.execCommand("copy");
    document.body.removeChild(area);
    return worked;
  } catch {
    return false;
  }
}

export default function BriefView({ data, investorName, firmName }: Props) {
  const { brief, sources } = data;
  // "idle" normally, "copied" after a success, "failed" if the browser blocked us.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // Copies the plain-text brief, trying the modern API first and the old one second.
  async function handleCopy() {
    const text = briefToText(data, investorName, firmName);

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState(copyUsingHiddenTextarea(text) ? "copied" : "failed");
    }

    // Go back to the normal label after a few seconds.
    setTimeout(() => setCopyState("idle"), 2500);
  }

  // The browser's own print dialog. Choosing "Save as PDF" there gives a PDF,
  // so we do not need any PDF library.
  function handlePrint() {
    window.print();
  }

  // Colour the confidence badge: green for high, amber for medium, red for low.
  const confidenceStyle = {
    high: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
    low: "bg-rose-50 text-rose-700 ring-rose-600/20",
  }[brief.dataConfidence];

  const buttonClass =
    "rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50";

  return (
    <div className="space-y-4">
      {/* --- Header: who, when, how long, and the action buttons --- */}
      <div className="print-card overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-indigo-50/80 to-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                {investorName}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-zinc-500">{firmName}</p>
            </div>

            <div className="no-print flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <button type="button" onClick={handleCopy} className={buttonClass}>
                  {copyState === "copied" ? "Copied!" : "Copy brief"}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className={buttonClass}
                  title={'In the print dialog choose "Save as PDF". "Microsoft Print to PDF" flattens the page, which loses the links.'}
                >
                  Download as PDF
                </button>
              </div>

              {/*
                The destination chosen in the print dialog decides whether the saved PDF
                keeps working links. The browser's own "Save as PDF" keeps them. The
                Windows "Microsoft Print to PDF" driver only receives a picture of the
                page, so every link is flattened. One line of guidance saves the user
                from a PDF whose sources cannot be opened.
              */}
              <p className="max-w-[15rem] text-right text-xs leading-relaxed text-zinc-500">
                Choose <span className="font-medium text-zinc-700">Save as PDF</span> in the
                print dialog to keep links clickable.
              </p>

              {copyState === "failed" && (
                <p className="text-xs text-rose-600">
                  Copying was blocked. Select the text and press Ctrl+C.
                </p>
              )}
            </div>
          </div>

          {/* Small facts row: when it was made, how long it took, how many sources. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Generated {data.generatedOn}</span>
            <span aria-hidden="true">·</span>
            <span>{data.generationSeconds}s</span>
            <span aria-hidden="true">·</span>
            <span>{sources.length} live sources</span>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-zinc-700">{brief.summary}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${confidenceStyle}`}
            >
              {brief.dataConfidence} confidence
            </span>
            <span className="text-xs leading-relaxed text-zinc-500">{brief.confidenceNote}</span>
          </div>
        </div>
      </div>

      {/* --- Section 1: Recent portfolio activity --- */}
      <SectionCard step="1" title="Recent Portfolio Activity" hint="Last 90 days only">
        <p className="mb-4 text-sm leading-relaxed text-zinc-600">{brief.recentActivity.note}</p>

        {brief.recentActivity.items.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
            No investments or exits from the last 90 days appeared in the live search results.
          </p>
        ) : (
          <ul className="space-y-3">
            {brief.recentActivity.items.map((item, i) => (
              <li key={i} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{item.headline}</p>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 ring-1 ring-zinc-200">
                    {item.date}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.description}</p>
                <div className="mt-2">
                  <SourceLink sources={sources} number={item.sourceNumber} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* --- Section 2: Investment thesis --- */}
      <SectionCard step="2" title="Investment Thesis" hint="What they say they invest in">
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sectors
            </p>
            {brief.investmentThesis.sectors.length === 0 ? (
              <p className="text-sm text-zinc-500">Not stated in the sources.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {brief.investmentThesis.sectors.map((sector, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Stages
            </p>
            {brief.investmentThesis.stages.length === 0 ? (
              <p className="text-sm text-zinc-500">Not stated in the sources.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {brief.investmentThesis.stages.map((stage, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                  >
                    {stage}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-3 border-t border-zinc-100 pt-4">
          {brief.investmentThesis.beliefs.map((belief, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <p className="text-sm leading-relaxed text-zinc-700">
                {belief.point} <SourceLink sources={sources} number={belief.sourceNumber} />
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* --- Section 3: Context and red flags --- */}
      <SectionCard step="3" title="Context & Red Flags" hint="Worth knowing before you walk in">
        <p className="mb-4 text-sm leading-relaxed text-zinc-600">{brief.contextAndRedFlags.note}</p>

        {brief.contextAndRedFlags.items.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
            Nothing notable showed up in the live search results.
          </p>
        ) : (
          <ul className="space-y-3">
            {brief.contextAndRedFlags.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <p className="text-sm leading-relaxed text-zinc-700">
                  {item.point} <SourceLink sources={sources} number={item.sourceNumber} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* --- Section 4: Three talking points --- */}
      <SectionCard step="4" title="Three Talking Points" hint="Tailored to your sector and stage">
        <ol className="space-y-3">
          {brief.talkingPoints.map((tp, i) => (
            <li
              key={i}
              className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
            >
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-indigo-200">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-relaxed text-zinc-900">{tp.point}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                    <span className="font-semibold text-indigo-700">Why this works:</span> {tp.why}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* --- Sources: built from the real Tavily results, not from the model --- */}
      <SectionCard title="Sources" hint={`${sources.length} live results used for this brief`}>
        <ol className="space-y-2.5">
          {sources.map((source) => (
            <li key={source.number} className="flex gap-2.5 text-sm">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-400">
                [{source.number}]
              </span>
              <span className="min-w-0">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="print-url text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:decoration-indigo-500"
                >
                  {source.title}
                </a>
                {source.publishedDate && (
                  <span className="ml-1.5 whitespace-nowrap text-xs text-zinc-400">
                    {source.publishedDate}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
