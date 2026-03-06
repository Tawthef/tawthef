import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const SYSTEM_PROMPT = `You are an expert resume writer.
Improve the candidate's professional summary for ATS and recruiter readability.

Rules:
- Return plain text only.
- Keep it to 2-4 sentences.
- Include impact-oriented language.
- Mention years of experience when available.
- Mention relevant technologies/skills naturally.
- Avoid first-person pronouns.
- No markdown or bullet points.`;

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
};

const clampYears = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(50, Math.round(parsed)));
};

const fallbackImprove = (summary: string, skills: string[], yearsExperience: number, role: string) => {
  const cleanSummary = summary.trim();
  const skillText = skills.slice(0, 6).join(", ");
  const roleText = role || "professional";
  const yearsText = yearsExperience > 0 ? `${yearsExperience}+ years` : "proven";

  if (cleanSummary) {
    return `${cleanSummary.replace(/\s+/g, " ").trim()} Experienced ${roleText} with ${yearsText} delivering measurable outcomes in fast-paced environments${skillText ? ` using ${skillText}` : ""}.`;
  }

  return `Results-oriented ${roleText} with ${yearsText} of experience delivering reliable outcomes${skillText ? ` across ${skillText}` : ""}. Strong collaborator with a track record of improving quality, performance, and delivery speed across cross-functional teams.`;
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
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Only candidates can improve summaries" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const summary = String(body.summary || "").trim().slice(0, 4000);
    const skills = sanitizeStringArray(body.skills);
    const yearsExperience = clampYears(body.years_experience);
    const role = String(body.role || "").trim().slice(0, 120);

    if (!summary && skills.length === 0 && yearsExperience === 0 && !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Provide at least one of summary, skills, years_experience, or role" }),
      };
    }

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ summary: fallbackImprove(summary, skills, yearsExperience, role) }),
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
        max_tokens: 260,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              summary,
              skills,
              years_experience: yearsExperience,
              role,
            }),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[improve-summary] OpenAI error", aiResponse.status, text);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ summary: fallbackImprove(summary, skills, yearsExperience, role) }),
      };
    }

    const payload = await aiResponse.json();
    const improved = String(payload?.choices?.[0]?.message?.content || "").trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary: improved || fallbackImprove(summary, skills, yearsExperience, role) }),
    };
  } catch (error: any) {
    console.error("[improve-summary] error", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: error?.message || "Unknown error" }),
    };
  }
};

