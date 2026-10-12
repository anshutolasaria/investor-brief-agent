// All the shared TypeScript types for the app, kept in one place.

/** What the user types into the form on the home page. */
export type BriefRequest = {
  investorName: string;
  firmName: string;
  startupSector: string;
  startupStage: string;
  startupDescription: string;
};

/** One search result coming back from the Tavily API. */
export type Source = {
  /** Position in the numbered list we send to Gemini: 1, 2, 3... */
  number: number;
  title: string;
  url: string;
  /** Publication date as "YYYY-MM-DD", or null when Tavily could not detect one. */
  publishedDate: string | null;
  /** Short text snippet from the page. */
  content: string;
};

/** One recent investment or exit found in the last 90 days. */
export type ActivityItem = {
  headline: string;
  date: string;
  description: string;
  sourceUrl: string;
};

/** A single claim with the link that backs it up. */
export type Claim = {
  point: string;
  sourceUrl: string;
};

/** One conversation opener for Priya to use in the meeting. */
export type TalkingPoint = {
  point: string;
  why: string;
};

/** The structured brief that Gemini returns. This matches the JSON schema in gemini.ts. */
export type Brief = {
  summary: string;
  recentActivity: {
    found: boolean;
    note: string;
    items: ActivityItem[];
  };
  investmentThesis: {
    sectors: string[];
    stages: string[];
    beliefs: Claim[];
  };
  contextAndRedFlags: {
    note: string;
    items: Claim[];
  };
  talkingPoints: TalkingPoint[];
  dataConfidence: "high" | "medium" | "low";
  confidenceNote: string;
};

/** The full payload the API route sends back to the browser on success. */
export type BriefResponse = {
  brief: Brief;
  sources: Source[];
  /** Today's date used for the 90-day window, as "YYYY-MM-DD". */
  generatedOn: string;
  /** How long the whole pipeline took, in seconds. */
  generationSeconds: number;
};

/** The payload the API route sends back when something goes wrong. */
export type ErrorResponse = {
  error: string;
};
