export type ExperienceEntry = {
  role?: string;
  company?: string;
  period?: string;
};

export type CvData = {
  skills: string[];
  summary: string;
  experience: ExperienceEntry[];
};

const SKILL_DICTIONARY = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "React",
  "Vue",
  "Angular",
  "Next.js",
  "Node.js",
  "Express",
  "NestJS",
  "Django",
  "Flask",
  "Spring",
  "Laravel",
  ".NET",
  "HTML",
  "CSS",
  "Tailwind",
  "Sass",
  "Bootstrap",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Prisma",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "Git",
  "Linux",
  "REST",
  "GraphQL",
  "gRPC",
  "Microservices",
  "Figma",
  "UI/UX",
  "Product Management",
  "Agile",
  "Scrum",
  "Kanban",
  "Machine Learning",
  "Data Analysis",
  "Tableau",
  "Power BI",
  "Excel",
  "SEO",
  "Marketing",
  "Communication",
  "Leadership",
  "Problem Solving",
  "Teamwork",
  "Project Management",
  "Scala",
  "Perl",
  "Bash",
  "Shell",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  for (const skill of SKILL_DICTIONARY) {
    const pattern = `(^|[^a-zA-Z])${escapeRegex(skill)}([^a-zA-Z]|$)`;
    if (new RegExp(pattern, "i").test(text)) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

const MONTHS =
  "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember";

const PERIOD_RE = new RegExp(
  `(?:(?:${MONTHS})[ .]*)?\\d{4}\\s*(?:[-–—]|s\\.?d\\.?|to|until)?\\s*(?:(?:(?:${MONTHS})[ .]*)?\\d{4}|present|now|sekarang|current|saat ini)`,
  "i",
);

function dedupeLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function cleanResidue(line: string, period: string): string {
  return line
    .replace(period, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/^[\s\-–—,.:|]+|[\s\-–—,.:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function heuristicCv(text: string): CvData {
  const skills = extractSkills(text);

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let summary = paragraphs[0] ?? text.replace(/\s+/g, " ").trim().slice(0, 300);
  if (summary.length > 600) summary = summary.slice(0, 600).trim() + "…";

  const lines = dedupeLines(text);
  const experience: ExperienceEntry[] = [];
  const seenExp = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(PERIOD_RE);
    if (!match) continue;
    const period = match[0].replace(/\s+/g, " ").trim();
    if (!period) continue;

    let role = cleanResidue(line, period);
    if (!role) {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].match(PERIOD_RE)) continue;
        const candidate = cleanResidue(lines[j], "");
        if (candidate) {
          role = candidate;
          break;
        }
      }
    }

    const key = `${role}|${period}`.toLowerCase();
    if (seenExp.has(key)) continue;
    seenExp.add(key);
    experience.push({ role: role || undefined, period });
    if (experience.length >= 10) break;
  }

  return { skills, summary, experience };
}

async function extractWithLlm(text: string): Promise<CvData> {
  const baseUrl = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY!;
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  const system =
    "You are a CV/resume parser. Extract structured data and respond with STRICT JSON only, no prose.";
  const user = `Return JSON with this exact shape:
{"skills": string[], "summary": string, "experience": [{"role": string, "company": string, "period": string}]}
Parse the CV below:
${text.slice(0, 12000)}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM request failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as Partial<CvData>;

  return {
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.map((s) => String(s).trim()).filter(Boolean)
      : [],
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    experience: Array.isArray(parsed.experience)
      ? parsed.experience
          .filter(
            (e): e is Record<string, unknown> =>
              Boolean(e) && typeof e === "object",
          )
          .map((e) => ({
            role: e.role ? String(e.role) : undefined,
            company: e.company ? String(e.company) : undefined,
            period: e.period ? String(e.period) : undefined,
          }))
      : [],
  };
}

export async function extractCv(text: string): Promise<CvData> {
  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    try {
      return await extractWithLlm(text);
    } catch (err) {
      console.error("[cv] LLM extraction failed, falling back to heuristic", err);
    }
  }
  return heuristicCv(text);
}
