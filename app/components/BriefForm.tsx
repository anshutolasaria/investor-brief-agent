"use client";

// The form at the top of the page: who the investor is, plus Priya's startup profile.
// The startup fields are needed because the talking points must be tailored to her
// sector and stage. They are pre-filled with a sensible D2C example but stay editable.

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
  // Updates one field while keeping the rest of the form unchanged.
  function setField(field: keyof BriefRequest, value: string) {
    onChange({ ...values, [field]: value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    onSubmit();
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-100";
  const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="print-card rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* --- Who is the meeting with? --- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="investorName">
            Investor name <span className="text-red-600">*</span>
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
            Firm name <span className="text-red-600">*</span>
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

      {/* --- Priya's startup, used to tailor the talking points --- */}
      <div className="mt-6 border-t border-zinc-200 pt-5">
        <p className="mb-4 text-sm font-semibold text-zinc-900">
          Your startup{" "}
          <span className="font-normal text-zinc-500">— used to tailor the talking points</span>
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

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      >
        {isLoading ? "Generating brief..." : "Generate brief"}
      </button>
    </form>
  );
}
