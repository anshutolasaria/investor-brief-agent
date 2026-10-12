// Talks to Google Gemini Flash using Google's official Gen AI SDK (@google/genai).
// Docs: https://ai.google.dev/gemini-api/docs/structured-output
// This is the ONLY place in the app where an AI model is called.

import { GoogleGenAI } from "@google/genai";
import type { Brief } from "./types";

/**
 * The Gemini Flash model we use. Kept in one constant so it is easy to change later.
 * "gemini-3.8-flash" is Google's current stable Flash model.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

/**
 * The exact JSON shape we force Gemini to return.
 * Because the model must fill this structure, we never have to parse free-form text,
 * and the frontend always gets the same fields.
 */
const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Two sentences introducing who this investor is, based only on the sources.",
    },
    recentActivity: {
      type: "object",
      properties: {
        found: { type: "boolean", description: "True only if at least one item is inside the 90-day window." },
        note: { type: "string", description: "One honest line, especially when nothing was found." },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headline: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD, copied from the source." },
              description: { type: "string" },
              sourceUrl: { type: "string", description: "Exact URL copied from the source list." },
            },
            required: ["headline", "date", "description", "sourceUrl"],
          },
        },
      },
      required: ["found", "note", "items"],
    },
    investmentThesis: {
      type: "object",
      properties: {
        sectors: { type: "array", items: { type: "string" } },
        stages: { type: "array", items: { type: "string" } },
        beliefs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              point: { type: "string" },
              sourceUrl: { type: "string" },
            },
            required: ["point", "sourceUrl"],
          },
        },
      },
      required: ["sectors", "stages", "beliefs"],
    },
    contextAndRedFlags: {
      type: "object",
      properties: {
        note: { type: "string", description: "One line; say plainly if nothing notable was found." },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              point: { type: "string" },
              sourceUrl: { type: "string" },
            },
            required: ["point", "sourceUrl"],
          },
        },
      },
      required: ["note", "items"],
    },
    talkingPoints: {
      type: "array",
      description: "Exactly three openers tailored to Priya's sector and stage.",
      items: {
        type: "object",
        properties: {
          point: { type: "string", description: "The opener, written so Priya can say it out loud." },
          why: { type: "string", description: "One line on why this lands with this investor." },
        },
        required: ["point", "why"],
      },
    },
    dataConfidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    confidenceNote: {
      type: "string",
      description: "Honest one-liner about how well the sources covered this investor.",
    },
  },
  required: [
    "summary",
    "recentActivity",
    "investmentThesis",
    "contextAndRedFlags",
    "talkingPoints",
    "dataConfidence",
    "confidenceNote",
  ],
};

/**
 * Sends the prompt to Gemini Flash and returns the parsed brief.
 * Throws a readable error if Gemini fails or sends back something unparseable.
 */
export async function generateBrief(prompt: string, apiKey: string): Promise<Brief> {
  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.interactions.create({
    model: GEMINI_MODEL,
    input: prompt,
    // This is "JSON mode": the response must match BRIEF_SCHEMA.
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: BRIEF_SCHEMA,
    },
  });

  const text = interaction.output_text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text) as Brief;
  } catch {
    throw new Error("Gemini returned text that was not valid JSON.");
  }
}
