import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const SYSTEM_PROMPT = `You are a senior resume coach.
Generate concise, impact-driven achievement bullet points for one work experience entry.

Rules:
- Return JSON object: {"achievements":["...","...","..."]}.
- 3 to 5 bullets.
- Start each bullet with a strong action verb.
- Include measurable impact when possible.
- Keep each bullet under 140 characters.
- No markdown. No numbering.`;

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
};

const sanitizeAchievements = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
};

const fallbackAchievements = (jobTitle: string, company: string, skills: string[]) => {
  const roleText = jobTitle || "role";
  const companyText = company || "organization";
  const skillText = skills.slice(0, 3).join(", ");

  return [
    `Delivered high-quality outcomes as ${roleText} at ${companyText} within cross-functional teams.`,
    `Improved delivery speed and reliability using ${skillText || "modern engineering practices"}.`,
    `Collaborated with stakeholders to prioritize features and ship measurable business impact.`,
  ];
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
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Only candidates can generate achievements" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const jobTitle = String(body.job_title || "").trim().slice(0, 120);
    const company = String(body.company || "").trim().slice(0, 120);
    const skills = sanitizeStringArray(body.skills);

    if (!jobTitle && !company && skills.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Provide at least one of job_title, company, or skills" }),
      };
    }

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ achievements: fallbackAchievements(jobTitle, company, skills) }),
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
        temperature: 0.5,
        max_tokens: 260,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              job_title: jobTitle,
              company,
              skills,
            }),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[generate-achievements] OpenAI error", aiResponse.status, text);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ achievements: fallbackAchievements(jobTitle, company, skills) }),
      };
    }

    const payload = await aiResponse.json();
    let achievements = sanitizeAchievements(payload?.achievements);
    if (achievements.length === 0) {
      const raw = String(payload?.choices?.[0]?.message?.content || "");
      try {
        const parsed = JSON.parse(raw);
        achievements = sanitizeAchievements(parsed?.achievements);
      } catch {
        achievements = [];
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ achievements: achievements.length ? achievements : fallbackAchievements(jobTitle, company, skills) }),
    };
  } catch (error: any) {
    console.error("[generate-achievements] error", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: error?.message || "Unknown error" }),
    };
  }
};
