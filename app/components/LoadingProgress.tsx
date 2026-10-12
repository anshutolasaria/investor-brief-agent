"use client";

// Shown while the brief is being generated.
// It counts the seconds and steps through friendly progress messages so the
// user is never looking at a blank screen.

import { useEffect, useState } from "react";

/** Each message appears once the elapsed time passes its "after" value (in seconds). */
const STEPS = [
  { after: 0, text: "Searching recent news..." },
  { after: 6, text: "Reading investor content..." },
  { after: 14, text: "Checking the last 90 days..." },
  { after: 22, text: "Writing your brief..." },
];

export default function LoadingProgress() {
  const [seconds, setSeconds] = useState(0);

  // Start a 1-second ticker when this component appears, and clean it up when it goes away.
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pick the last step whose "after" time we have already passed.
  const currentStep = STEPS.filter((step) => seconds >= step.after).pop() ?? STEPS[0];

  return (
    <div className="print-card rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* A simple spinning circle. */}
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        <div>
          <p className="text-sm font-medium text-zinc-900">{currentStep.text}</p>
          <p className="text-xs text-zinc-500">
            {seconds}s elapsed — this usually takes 15-40 seconds
          </p>
        </div>
      </div>

      {/* A thin bar that fills up towards the 2-minute goal. */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-1000"
          style={{ width: `${Math.min(95, (seconds / 40) * 100)}%` }}
        />
      </div>
    </div>
  );
}
