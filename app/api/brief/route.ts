// The one and only backend endpoint: POST /api/brief
// Steps: validate input -> search the live web with Tavily -> ask Gemini Flash
// for a structured brief -> send JSON back to the browser.

import { NextResponse } from "next/server";
import { searchAll, cleanText, toDateString } from "@/lib/tavily";
import { buildPrompt } from "@/lib/prompt";
import { generateBrief } from "@/lib/gemini";
import type { BriefRequest, BriefResponse, ErrorResponse } from "@/lib/types";

// Vercel's Hobby plan allows up to 300 seconds. We cap this route at 120s,
// which matches the 2-minute goal in the brief. In practice it finishes in ~15-40s.
export const maxDuration = 120;

// Note: POST handlers are never cached by Next.js, so every request always
// hits the live web. No extra cache configuration is needed here.

/** Small helper so every error we return looks the same. */
function fail(message: string, status: number) {
  return NextResponse.json<ErrorResponse>({ error: message }, { status });
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // ---- Step 0: check the API keys exist (server-side only) ----
  const tavilyKey = process.env.TAVILY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!tavilyKey) {
    return fail("TAVILY_API_KEY is not set on the server. Add it to .env.local (or to Vercel) and restart.", 500);
  }
  if (!geminiKey) {
    return fail("GEMINI_API_KEY is not set on the server. Add it to .env.local (or to Vercel) and restart.", 500);
  }

  // ---- Step 1: read and validate the form input ----
  let input: BriefRequest;
  try {
    input = (await request.json()) as BriefRequest;
  } catch {
    return fail("Could not read the request. Please try again.", 400);
  }

  const investorName = (input.investorName ?? "").trim();
  const firmName = (input.firmName ?? "").trim();

  if (!investorName || !firmName) {
    return fail("Please enter both an investor name and a firm name.", 400);
  }
  if (investorName.length > 120 || firmName.length > 120) {
    return fail("Investor name and firm name must each be under 120 characters.", 400);
  }

  // Fall back to sensible defaults if the startup profile fields come through empty.
  // cleanText also strips half-emoji and control characters, which would otherwise
  // make the request we send to Gemini invalid.
  const cleaned: BriefRequest = {
    investorName: cleanText(investorName),
    firmName: cleanText(firmName),
    startupSector: cleanText((input.startupSector ?? "").trim()) || "D2C / Consumer brands",
    startupStage: cleanText((input.startupStage ?? "").trim()) || "Seed",
    // If she left the description empty we say so honestly rather than inventing a
    // product for her. The sector and stage are still enough to tailor the openers.
    startupDescription:
      cleanText((input.startupDescription ?? "").trim().slice(0, 300)) ||
      "Not specified - tailor the talking points using the sector and stage only.",
  };

  const today = new Date();

  // ---- Step 2 & 3: run the live searches in parallel, merge + de-duplicate ----
  let sources;
  try {
    sources = await searchAll(cleaned.investorName, cleaned.firmName, tavilyKey, today);
  } catch (error) {
    console.error("Tavily search failed:", error);
    return fail("Live web search failed. Check the TAVILY_API_KEY and try again in a moment.", 502);
  }

  if (sources.length === 0) {
    return fail(
      `No web results were found for "${cleaned.investorName}" at "${cleaned.firmName}". Please check the spelling, or try the firm name on its own.`,
      404,
    );
  }

  // ---- Step 4: ask Gemini Flash for the structured brief ----
  let brief;
  try {
    const prompt = buildPrompt(cleaned, sources, today);
    brief = await generateBrief(prompt, geminiKey);
  } catch (error) {
    console.error("Gemini failed:", error);
    return fail("The AI model could not produce the brief. Check the GEMINI_API_KEY and try again.", 502);
  }

  // ---- Step 5: send the result back to the frontend ----
  const payload: BriefResponse = {
    brief,
    sources,
    generatedOn: toDateString(today),
    generationSeconds: Math.round((Date.now() - startedAt) / 100) / 10, // one decimal place
  };

  return NextResponse.json<BriefResponse>(payload);
}
