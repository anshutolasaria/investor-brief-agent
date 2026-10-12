"use client";

// Shown while the brief is being generated. It counts the seconds and ticks off
// each step as it goes, so the user is never looking at a blank screen.

import { useEffect, useState } from "react";

/** Each step lights up once the elapsed time passes its "after" value (in seconds). */
const STEPS = [
  { after: 0, text: "Searching recent news" },
  { after: 6, text: "Reading investor content" },
  { after: 14, text: "Checking the last 90 days" },
  { after: 22, text: "Writing your brief" },
];

export default function LoadingProgress() {
  const [seconds, setSeconds] = useState(0);

  // Start a 1-second ticker when this appears, and clean it up when it goes away.
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // The index of the step we are currently on.
  const currentIndex = STEPS.reduce((last, step, i) => (seconds >= step.after ? i : last), 0);

  return (
    <div className="print-card rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-zinc-900">Building your brief</p>
        <p className="font-mono text-xs text-zinc-500">{seconds}s</p>
      </div>

      <ol className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          return (
            <li key={step.text} className="flex items-center gap-3">
              {/* Tick for finished steps, spinner for the current one, dot for the rest. */}
              {done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                  ✓
                </span>
              ) : active ? (
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-zinc-200" />
              )}

              <span
                className={
                  done
                    ? "text-sm text-zinc-400"
                    : active
                      ? "text-sm font-medium text-zinc-900"
                      : "text-sm text-zinc-400"
                }
              >
                {step.text}
              </span>
            </li>
          );
        })}
      </ol>

      {/* A thin bar that fills towards a typical finish time. */}
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-1000"
          style={{ width: `${Math.min(95, (seconds / 40) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">This usually takes 15–40 seconds.</p>
    </div>
  );
}
