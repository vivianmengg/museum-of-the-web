import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { BrowseFilters } from "@/lib/constants";

const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You parse natural language museum collection search queries into structured filters.

The collection contains art objects from many cultures and periods. Extract:
- q: 1–3 core keywords for the object type/subject (required, always in English)
- culture: cultural origin, exactly as a museum would record it — e.g. "Japanese", "French", "Ancient Egyptian", "Chinese", "Korean", "British"
- medium: material or technique — e.g. "oil on canvas", "bronze", "porcelain", "woodblock print", "watercolor"
- dateBegin: start year as an integer (interpret periods: "Edo period" → 1603, "Renaissance" → 1400, "19th century" → 1800, "ancient" → -3000)
- dateEnd: end year as an integer

Rules:
- Only include fields clearly implied by the query.
- q should be the object/subject stripped of culture/time/medium (those go in their own fields).
- If the query is already a simple keyword with no modifiers, put it in q and omit the rest.
- Never invent filters not implied by the query.`;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

type ParsedFilters = {
  q: string;
  culture?: string;
  medium?: string;
  dateBegin?: number;
  dateEnd?: number;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ q: "" });

  const apiKey = process.env.GOOGLE_AI_API_KEY;

  // No API key — return raw query as-is (graceful fallback)
  if (!apiKey) {
    return NextResponse.json({ q } satisfies BrowseFilters);
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nQuery: "${q}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              q:         { type: "STRING" },
              culture:   { type: "STRING" },
              medium:    { type: "STRING" },
              dateBegin: { type: "INTEGER" },
              dateEnd:   { type: "INTEGER" },
            },
            required: ["q"],
          },
          temperature: 0,
          maxOutputTokens: 128,
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data: GeminiResponse = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("empty response");

    const parsed: ParsedFilters = JSON.parse(text);

    const filters: BrowseFilters = {
      q: parsed.q || q,
      ...(parsed.culture   && { culture:   parsed.culture }),
      ...(parsed.medium    && { medium:    parsed.medium }),
      ...(parsed.dateBegin && { dateBegin: String(parsed.dateBegin) }),
      ...(parsed.dateEnd   && { dateEnd:   String(parsed.dateEnd) }),
    };

    return NextResponse.json(filters);
  } catch (err) {
    // Any failure → fall back to raw query, don't break search
    console.error("AI search parse failed:", err);
    return NextResponse.json({ q } satisfies BrowseFilters);
  }
}
