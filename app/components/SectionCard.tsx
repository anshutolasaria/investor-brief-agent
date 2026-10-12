// A plain white card with a title. Every section of the brief sits inside one of these,
// so the whole page looks consistent and prints nicely.

import type { ReactNode } from "react";

type Props = {
  /** The small number shown in the circle, e.g. "1". */
  step?: string;
  title: string;
  children: ReactNode;
};

export default function SectionCard({ step, title, children }: Props) {
  return (
    <section className="print-card rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-zinc-900">
        {step && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
            {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}
