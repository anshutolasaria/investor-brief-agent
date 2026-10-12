// A small "Source" link used under each factual claim.
// The .print-url class makes the full URL appear in the printed PDF.

type Props = {
  url: string;
};

export default function SourceLink({ url }: Props) {
  if (!url) return null;

  // Show just the domain, so the line stays short and readable.
  let label = url;
  try {
    label = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // If the URL is malformed we just show it as-is.
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="print-url text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
    >
      {label}
    </a>
  );
}
