// A white card with a numbered heading. Every section of the brief sits inside one,
// so the page looks consistent and prints cleanly.

import type { ReactNode } from "react";

type Props = {
  /** The number shown in the badge, e.g. "1". Leave out for an unnumbered card. */
  step?: string;
  title: string;
  /** Optional small grey line under the title. */
  hint?: string;
  children: ReactNode;
};

export default function SectionCard({ step, title, hint, children }: Props) {
  return (
    <section className="print-card overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <header className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
        {step && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
            {step}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
        </div>
      </header>

      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
