import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const SYSTEM_PROMPT = `You are a professional CV/Resume parser. Extract structured data from the provided resume text.

Return a valid JSON object with exactly these fields:
{
  "name": "Candidate Name",
  "skills": ["skill1", "skill2"],
  "job_titles": ["Previous Job Title 1", "Current Title"],
  "years_experience": 5,
  "education": ["BSc Computer Science, MIT, 2018", "MSc Data Science, Stanford, 2020"],
  "location": "City, Country",
  "keywords": ["keyword1", "keyword2"],
  "experience": [
    { "company": "Company", "role": "Role", "start_date": "YYYY-MM", "end_date": "YYYY-MM or Present", "description": "One-line description" }
  ],
  "projects": [
    { "name": "Project Name", "description": "One-line impact description", "link": "" }
  ]
}

Rules:
- name: Best full name detected from heading/contact section.
- skills: Array of technical and soft skills found. Lowercase. Max 30.
- job_titles: Array of job titles the person has held. Proper case. Max 10.
- years_experience: Integer. Total years of professional experience. Estimate from dates if not stated.
- education: Array of education entries in format "Degree, Institution, Year". Max 5.
- location: Most recent location mentioned. Use "City, Country" format if possible.
- keywords: Array of domain-specific keywords and industry terms. Lowercase. Max 20.
- experience: Array of structured entries. Max 6.
- projects: Array of structured project entries. Max 6.
- Return ONLY the JSON object. No markdown, no explanation.`;

interface ParsedExperience {
    company: string;
    role: string;
    start_date: string;
    end_date: string;
    description: string;
}

interface ParsedProject {
    name: string;
    description: string;
    link: string;
}

interface ParsedResume {
    name: string;
    skills: string[];
    job_titles: string[];
    years_experience: number;
    education: string[];
    location: string;
    keywords: string[];
    experience: ParsedExperience[];
    projects: ParsedProject[];
}

function validateParsedOutput(data: any): ParsedResume {
    const experience = Array.isArray(data?.experience)
        ? data.experience.map((item: any) => ({
            company: String(item?.company || '').trim().slice(0, 120),
            role: String(item?.role || '').trim().slice(0, 120),
            start_date: String(item?.start_date || '').trim().slice(0, 20),
            end_date: String(item?.end_date || '').trim().slice(0, 20),
            description: String(item?.description || '').trim().slice(0, 500),
        })).slice(0, 6)
        : [];

    const projects = Array.isArray(data?.projects)
        ? data.projects.map((item: any) => ({
            name: String(item?.name || '').trim().slice(0, 120),
            description: String(item?.description || '').trim().slice(0, 500),
            link: String(item?.link || '').trim().slice(0, 300),
        })).slice(0, 6)
        : [];

    return {
        name: typeof data?.name === 'string' ? data.name.trim().slice(0, 120) : '',
        skills: Array.isArray(data?.skills) ? data.skills.map((s: any) => String(s).toLowerCase()).slice(0, 30) : [],
        job_titles: Array.isArray(data?.job_titles) ? data.job_titles.map((t: any) => String(t)).slice(0, 10) : [],
        years_experience: typeof data?.years_experience === 'number' ? Math.max(0, Math.round(data.years_experience)) : 0,
        education: Array.isArray(data?.education) ? data.education.map((e: any) => String(e)).slice(0, 5) : [],
        location: typeof data?.location === 'string' ? data.location : '',
        keywords: Array.isArray(data?.keywords) ? data.keywords.map((k: any) => String(k).toLowerCase()).slice(0, 20) : [],
        experience,
        projects,
    };
}

const handler: Handler = async (event: HandlerEvent) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        // 1. Authenticate the request
        const authHeader = event.headers.authorization || event.headers.Authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization token' }) };
        }

        // Verify token with Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
        }

        // 2. Parse request body
        const body = JSON.parse(event.body || '{}');
        const resumeText = body.resume_text;

        if (!resumeText || typeof resumeText !== 'string') {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'resume_text is required' }) };
        }

        // 5MB text limit
        if (resumeText.length > 5 * 1024 * 1024) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Resume text too large (max 5MB)' }) };
        }

        // 3. Check if OpenAI key is available
        if (!OPENAI_API_KEY) {
            // Fallback to enhanced regex parsing
            console.log('[parse-resume] No OPENAI_API_KEY, using fallback parser');
            const fallback = fallbackParse(resumeText);
            return { statusCode: 200, headers, body: JSON.stringify(fallback) };
        }

        // 4. Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Parse this resume:\n\n${resumeText.slice(0, 15000)}` },
                ],
                temperature: 0.1,
                max_tokens: 1500,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[parse-resume] OpenAI error:', response.status, errText);
            // Fallback on OpenAI failure
            const fallback = fallbackParse(resumeText);
            return { statusCode: 200, headers, body: JSON.stringify(fallback) };
        }

        const aiResponse = await response.json();
        const rawContent = aiResponse.choices?.[0]?.message?.content || '{}';

        let parsed: ParsedResume;
        try {
            const jsonData = JSON.parse(rawContent);
            parsed = validateParsedOutput(jsonData);
        } catch {
            console.error('[parse-resume] Failed to parse AI JSON, using fallback');
            parsed = fallbackParse(resumeText);
        }

        return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err: any) {
        console.error('[parse-resume] Server error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: err.message }),
        };
    }
};

/**
 * Enhanced regex-based fallback parser when OpenAI is unavailable
 */
function fallbackParse(text: string): ParsedResume {
    const lower = text.toLowerCase();

    // Name extraction from top lines
    let name = '';
    const firstLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
    for (const line of firstLines) {
        if (
            /^[A-Za-z][A-Za-z\s'.-]{2,60}$/.test(line) &&
            !line.toLowerCase().includes('resume') &&
            !line.includes('@')
        ) {
            name = line;
            break;
        }
    }

    // Skills extraction
    const skillsList = [
        'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'nodejs', 'python',
        'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
        'html', 'css', 'sass', 'tailwind', 'bootstrap',
        'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd',
        'git', 'github', 'gitlab', 'bitbucket',
        'agile', 'scrum', 'jira', 'confluence',
        'figma', 'photoshop', 'sketch', 'adobe',
        'machine learning', 'data science', 'artificial intelligence', 'nlp', 'deep learning',
        'project management', 'leadership', 'communication', 'teamwork', 'problem solving',
        'rest api', 'graphql', 'microservices', 'devops', 'linux',
        'excel', 'power bi', 'tableau', 'data analysis',
        'marketing', 'sales', 'accounting', 'finance', 'hr', 'recruitment',
    ];
    const skills = skillsList.filter(s => lower.includes(s));

    // Experience extraction
    let yearsExp = 0;
    const expPatterns = [
        /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
        /experience[:\s]*(\d+)\+?\s*years?/i,
        /(\d+)\+?\s*years?\s*in/i,
    ];
    for (const p of expPatterns) {
        const m = text.match(p);
        if (m) { yearsExp = parseInt(m[1], 10); break; }
    }

    // Location extraction
    let location = '';
    const locMatch = text.match(/(?:location|address|city|based in)[:\s]*([^\n,]{3,40})/i);
    if (locMatch) location = locMatch[1].trim();

    // Education
    const education: string[] = [];
    const eduPatterns = [
        /(?:bachelor|master|phd|doctorate|bsc|msc|mba|b\.?a\.?|m\.?a\.?|b\.?s\.?|m\.?s\.?)[^.\n]{5,80}/gi,
    ];
    for (const p of eduPatterns) {
        const matches = text.match(p);
        if (matches) education.push(...matches.slice(0, 5).map(m => m.trim()));
    }

    // Job titles
    const titlePatterns = [
        /(?:position|title|role|worked as|serving as)[:\s]*([^\n]{5,60})/gi,
    ];
    const jobTitles: string[] = [];
    for (const p of titlePatterns) {
        let m;
        while ((m = p.exec(text)) !== null && jobTitles.length < 5) {
            jobTitles.push(m[1].trim());
        }
    }

    // Experience (lightweight fallback from detected titles)
    const experience: ParsedExperience[] = jobTitles.slice(0, 6).map((title) => ({
        company: '',
        role: title,
        start_date: '',
        end_date: '',
        description: '',
    }));

    // Project extraction
    const projects: ParsedProject[] = [];
    const projectMatches = text.match(/(?:project|projects)[:\s-]*([^\n]{8,120})/gi) || [];
    projectMatches.slice(0, 6).forEach((match) => {
        const clean = match.replace(/(?:project|projects)[:\s-]*/i, '').trim();
        if (clean) {
            projects.push({
                name: clean.slice(0, 80),
                description: '',
                link: '',
            });
        }
    });

    // Keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that', 'these', 'those']);
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const freq: Record<string, number> = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);

    return {
        name,
        skills,
        job_titles: jobTitles,
        years_experience: yearsExp,
        education,
        location,
        keywords,
        experience,
        projects,
    };
}

export { handler };
