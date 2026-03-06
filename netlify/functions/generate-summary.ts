import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const SYSTEM_PROMPT = `You are an expert CV writer.
Generate a concise and professional summary for a candidate resume.

Output rules:
- Return plain text only.
- 2 to 4 sentences.
- Mention years of experience.
- Mention the most relevant skills.
- Mention recent role naturally.
- No bullet points.
- No markdown.
- No placeholders.`;

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
};

const clampYears = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(50, Math.round(parsed)));
};

const fallbackSummary = (skills: string[], yearsExperience: number, recentRole: string) => {
  const skillText = skills.slice(0, 6).join(", ");
  const roleText = recentRole || "professional role";
  const yearsText = yearsExperience > 0 ? `${yearsExperience}+ years` : "proven";

  if (!skillText) {
    return `Results-driven professional with ${yearsText} of experience in ${roleText}, known for delivering high-quality outcomes, collaborating with cross-functional teams, and adapting quickly to business and technical priorities.`;
  }

  return `Results-driven ${roleText} with ${yearsText} of experience building and delivering impact across ${skillText}. Strong track record of collaborating with cross-functional teams, solving complex problems, and shipping reliable outcomes aligned with business goals.`;
};

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Missing authorization token" }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid token" }) };
    }

    const { data: roleRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (roleRow?.role && roleRow.role !== "candidate" && roleRow.role !== "admin") {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Only candidates can generate CV summaries" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const skills = sanitizeStringArray(body.skills);
    const yearsExperience = clampYears(body.years_experience);
    const recentRole = String(body.recent_role || "").trim().slice(0, 120);

    if (skills.length === 0 && yearsExperience === 0 && !recentRole) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "At least one of skills, years_experience, or recent_role is required" }),
      };
    }

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ summary: fallbackSummary(skills, yearsExperience, recentRole) }),
      };
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              skills,
              years_experience: yearsExperience,
              recent_role: recentRole,
            }),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[generate-summary] OpenAI error", aiResponse.status, text);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ summary: fallbackSummary(skills, yearsExperience, recentRole) }),
      };
    }

    const payload = await aiResponse.json();
    const summary = String(payload?.choices?.[0]?.message?.content || "").trim();
    const safeSummary = summary || fallbackSummary(skills, yearsExperience, recentRole);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary: safeSummary }),
    };
  } catch (error: any) {
    console.error("[generate-summary] error", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: error?.message || "Unknown error" }),
    };
  }
};
