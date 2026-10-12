// A small "[3] domain.com" link shown under each factual claim.
//
// The model never writes URLs. It only gives us a source NUMBER, and we look the
// real URL up here from the list Tavily returned. That means a mangled or invented
// URL is simply impossible. If the model cites a number that does not exist, we
// render nothing rather than a broken link.

import type { Source } from "@/lib/types";

type Props = {
  sources: Source[];
  number: number;
};

export default function SourceLink({ sources, number }: Props) {
  const source = sources.find((s) => s.number === number);
  if (!source) return null;

  // Show just the domain, so the line stays short and readable.
  let domain = source.url;
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    // If the URL is malformed we just show it as-is.
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="print-url whitespace-nowrap text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
    >
      [{source.number}] {domain}
    </a>
  );
}
