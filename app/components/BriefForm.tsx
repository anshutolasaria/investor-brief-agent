"use client";

// The search form.
//
// The only things Priya types per meeting are the investor and the firm - that is
// what the brief asks for. Her own startup does not change between meetings, so it
// lives in a section that stays collapsed and is remembered in the browser. It is
// still needed, because the talking points must be tailored to her sector and stage.

import { useState } from "react";
import type { BriefRequest } from "@/lib/types";

/** The four stages Priya can pick from. */
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B+"];

type Props = {
  values: BriefRequest;
  onChange: (values: BriefRequest) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export default function BriefForm({ values, onChange, onSubmit, isLoading }: Props) {
  // Whether the "your startup" section is open. Closed by default.
  const [profileOpen, setProfileOpen] = useState(false);

  // Updates one field while keeping the rest of the form unchanged.
  function setField(field: keyof BriefRequest, value: string) {
    onChange({ ...values, [field]: value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    onSubmit();
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-zinc-50 disabled:text-zinc-500";
  const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="print-card overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]"
    >
      {/* --- The actual search: who is the meeting with? --- */}
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="investorName">
              Investor name <span className="text-red-500">*</span>
            </label>
            <input
              id="investorName"
              className={inputClass}
              value={values.investorName}
              onChange={(e) => setField("investorName", e.target.value)}
              placeholder="e.g. Fred Wilson"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="firmName">
              Firm name <span className="text-red-500">*</span>
            </label>
            <input
              id="firmName"
              className={inputClass}
              value={values.firmName}
              onChange={(e) => setField("firmName", e.target.value)}
              placeholder="e.g. Union Square Ventures"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isLoading ? "Generating brief…" : "Generate brief"}
        </button>
      </div>

      {/* --- Her own startup: set once, remembered, collapsed by default --- */}
      <div className="mt-5 border-t border-zinc-100 bg-zinc-50/60">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          disabled={isLoading}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-zinc-100/60 disabled:cursor-not-allowed sm:px-6"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-800">Your startup</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">
              {/* When closed, show what is currently set, so nothing is hidden. */}
              {values.startupSector} · {values.startupStage} — used to tailor the talking points
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-indigo-600">
            {profileOpen ? "Hide" : "Edit"}
          </span>
        </button>

        {profileOpen && (
          <div className="border-t border-zinc-100 px-5 py-5 sm:px-6">
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              The brief has to tailor its talking points to your sector and stage, so it needs
              these. You only set them once — they are saved in this browser.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="startupSector">
                  Sector
                </label>
                <input
                  id="startupSector"
                  className={inputClass}
                  value={values.startupSector}
                  onChange={(e) => setField("startupSector", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="startupStage">
                  Stage
                </label>
                <select
                  id="startupStage"
                  className={inputClass}
                  value={values.startupStage}
                  onChange={(e) => setField("startupStage", e.target.value)}
                  disabled={isLoading}
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass} htmlFor="startupDescription">
                One-line description
              </label>
              <input
                id="startupDescription"
                className={inputClass}
                value={values.startupDescription}
                onChange={(e) => setField("startupDescription", e.target.value)}
                maxLength={300}
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
