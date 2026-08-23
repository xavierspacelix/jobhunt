import { z } from "zod";

export type ExperienceEntry = {
  role?: string;
  company?: string;
  period?: string;
};

export type EducationEntry = {
  school?: string;
  degree?: string;
  period?: string;
};

export type CertificationEntry = {
  name?: string;
  issuer?: string;
  period?: string;
};

export type CvData = {
  fullName?: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  skills: string[];
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  links: string[];
};

const optionalCvString = z.string().trim();
const cvExperienceSchema = z
  .object({
    role: optionalCvString,
    company: optionalCvString,
    period: optionalCvString,
  })
  .strict();
const cvEducationSchema = z
  .object({
    school: optionalCvString,
    degree: optionalCvString,
    period: optionalCvString,
  })
  .strict();
const cvCertificationSchema = z
  .object({
    name: optionalCvString,
    issuer: optionalCvString,
    period: optionalCvString,
  })
  .strict();
const cvLlmSchema = z
  .object({
    fullName: optionalCvString,
    headline: optionalCvString,
    location: optionalCvString,
    email: optionalCvString,
    phone: optionalCvString,
    skills: z.array(z.string().trim().min(1)),
    summary: z.string().trim(),
    experience: z.array(cvExperienceSchema),
    education: z.array(cvEducationSchema),
    certifications: z.array(cvCertificationSchema),
    links: z.array(z.string().trim().min(1)),
  })
  .strict();

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

const DEFAULT_LLM_TIMEOUT_MS = 120_000;
const MIN_LLM_TIMEOUT_MS = 5_000;
const MAX_LLM_TIMEOUT_MS = 300_000;

export function getLlmTimeoutMs(): number {
  const configured = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isInteger(configured) &&
    configured >= MIN_LLM_TIMEOUT_MS &&
    configured <= MAX_LLM_TIMEOUT_MS
    ? configured
    : DEFAULT_LLM_TIMEOUT_MS;
}

export function parseCvLlmOutput(value: unknown): CvData {
  return cvLlmSchema.parse(value);
}

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

const TITLE_KW =
  /(developer|engineer|manager|designer|administrator|analyst|lead|consultant|specialist|intern|architect|officer|coordinator|technician|programmer|mahasiswa|karyawan|founder|owner|ceo|cto)/i;

const SECTION_TITLES: { key: string; re: RegExp }[] = [
  {
    key: "summary",
    re: /^(summary|profil|profile|tentang|about me|objective|ringkasan|career objective)/i,
  },
  {
    key: "experience",
    re: /^(pengalaman|experience|work(ing)?|kerja|employment|riwayat kerja|professional experience|work history)/i,
  },
  {
    key: "education",
    re: /^(pendidikan|education|akademik|academic|formal education)/i,
  },
  {
    key: "certifications",
    re: /^(sertifikat|certification|certificate|certifications|sertif)\b/i,
  },
  {
    key: "skills",
    re: /^(skills?|keahlian|kompetensi|technical skills?|teknis|tech ?stack|software skills?|tools?|core competencies|programming languages?)\b/i,
  },
];

const HEADING_LINE_RE =
  /^(skills|experience|work|education|pengalaman|keahlian|pendidikan|summary|profil|profile|contact|references?|projects?)\b/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type LlmCredentials = {
  apiKey: string;
  baseUrl: string;
  model?: string;
};

function resolveCredentials(creds?: LlmCredentials): LlmCredentials | null {
  const baseUrl = (creds?.baseUrl ?? process.env.LLM_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const apiKey = creds?.apiKey ?? process.env.LLM_API_KEY ?? "";
  const model = creds?.model ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
  if (!baseUrl || !apiKey) return null;
  return { apiKey, baseUrl, model };
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

function isContactLine(line: string): boolean {
  return (
    /@|https?:\/\/|linkedin|github/i.test(line) ||
    /^\+?\d[\d\s().-]{7,}$/.test(line.trim())
  );
}

function splitRoleCompany(value: string): {
  role?: string;
  company?: string;
} {
  const match = value.match(/^(.*?)\s+(?:at|@|–|—)\s+(.+)$/i);
  if (match) {
    const role = match[1].trim();
    const company = match[2].trim();
    if (role && company && company.length <= 40) {
      return { role, company };
    }
  }
  return { role: value.trim() || undefined };
}

function detectSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of lines) {
    const heading = SECTION_TITLES.find(
      (s) => s.re.test(line) && line.length <= 60,
    );
    if (heading) {
      current = heading.key;
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return sections;
}

function extractLinks(text: string): string[] {
  const found = new Set<string>();
  const re = /https?:\/\/[^\s)<>"']+/gi;
  for (const m of text.matchAll(re)) {
    found.add(m[0].replace(/[).,;]+$/, ""));
  }
  return Array.from(found);
}

function parseContact(lines: string[]): {
  email?: string;
  phone?: string;
  location?: string;
} {
  let email: string | undefined;
  let phone: string | undefined;
  let location: string | undefined;

  for (const line of lines) {
    const emailMatch = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch && !email) email = emailMatch[0];
    const phoneMatch = line.match(/(?:\+62|62|0)\s?\d[\d\s().-]{6,}\d/);
    if (phoneMatch && !phone) {
      phone = phoneMatch[0].replace(/\s+/g, " ").trim();
    }
  }

  const contactLine = lines.find((l) => /@|https?:\/\//.test(l));
  if (contactLine) {
    for (const seg of contactLine.split("|")) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      if (/@/.test(trimmed)) continue;
      if (/(?:\+62|62|0)\s?\d[\d\s().-]{6,}\d/.test(trimmed)) continue;
      if (!location && /[a-zA-Z]{3}/.test(trimmed)) location = trimmed;
    }
  }

  return { email, phone, location };
}

function parseDatedEntries(
  lines: string[],
  opts: { secondary?: "degree" | "issuer" },
): { primary: string; secondary?: string; period: string }[] {
  const out: { primary: string; secondary?: string; period: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(PERIOD_RE);
    if (!match) continue;
    const period = match[0].replace(/\s+/g, " ").trim();
    if (!period) continue;

    let primary = cleanResidue(lines[i], period);
    if (!primary && i > 0) primary = cleanResidue(lines[i - 1], "");
    let secondary: string | undefined;
    if (opts.secondary && i + 1 < lines.length) {
      const nxt = cleanResidue(lines[i + 1], "");
      if (nxt && !PERIOD_RE.test(nxt)) secondary = nxt;
    }

    const key = `${primary}|${secondary}|${period}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ primary, secondary, period });
  }
  return out;
}

export function heuristicCv(text: string): CvData {
  const skills = extractSkills(text);
  const lines = dedupeLines(text);
  const sections = detectSections(lines);
  const contact = parseContact(lines);
  const links = extractLinks(text);

  const fullName =
    lines[0] &&
    !HEADING_LINE_RE.test(lines[0]) &&
    !isContactLine(lines[0]) &&
    lines[0].length <= 40
      ? lines[0]
      : undefined;

  let headline: string | undefined;
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    if (HEADING_LINE_RE.test(line) || isContactLine(line)) continue;
    if (TITLE_KW.test(line)) {
      headline = line;
      break;
    }
  }

  let summary = "";
  const summaryLines = sections.summary;
  if (summaryLines && summaryLines.length) {
    summary = summaryLines.join(" ").replace(/\s+/g, " ").trim();
  } else {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const p of paragraphs) {
      if (isContactLine(p)) continue;
      if (HEADING_LINE_RE.test(p)) continue;
      if (p.length < 60) continue;
      summary = p;
      break;
    }
    if (!summary && paragraphs.length) summary = paragraphs[0];
  }
  if (summary.length > 800) summary = summary.slice(0, 800).trim() + "…";

  const skillSection = sections.skills;
  if (skillSection) {
    for (const line of skillSection) {
      for (const token of line.split(/[,;•·|/]/)) {
        const t = token.trim().replace(/^[-–—:.]\s*/, "");
        if (t && t.length <= 30 && !/^\W+$/.test(t) && !skills.includes(t)) {
          skills.push(t);
        }
      }
    }
  }

  const experienceLines = sections.experience ?? lines;
  const experience: ExperienceEntry[] = [];
  const seenExp = new Set<string>();
  for (let i = 0; i < experienceLines.length; i++) {
    const line = experienceLines[i];
    const match = line.match(PERIOD_RE);
    if (!match) continue;
    const period = match[0].replace(/\s+/g, " ").trim();
    if (!period) continue;

    let role = cleanResidue(line, period);
    if (!role) {
      for (let j = i - 1; j >= 0; j--) {
        if (PERIOD_RE.test(experienceLines[j])) continue;
        const candidate = cleanResidue(experienceLines[j], "");
        if (candidate) {
          role = candidate;
          break;
        }
      }
    }
    const { role: parsedRole, company } = splitRoleCompany(role ?? "");
    const key = `${parsedRole}|${company}|${period}`.toLowerCase();
    if (seenExp.has(key)) continue;
    seenExp.add(key);
    experience.push({
      role: parsedRole || undefined,
      company: company || undefined,
      period,
    });
    if (experience.length >= 12) break;
  }

  const education = (
    sections.education
      ? parseDatedEntries(sections.education, { secondary: "degree" })
      : []
  ).map((e) => ({
    school: e.primary || undefined,
    degree: e.secondary || undefined,
    period: e.period,
  }));

  const certifications = (
    sections.certifications
      ? parseDatedEntries(sections.certifications, { secondary: "issuer" })
      : []
  ).map((e) => ({
    name: e.primary || undefined,
    issuer: e.secondary || undefined,
    period: e.period,
  }));

  return {
    fullName,
    headline,
    location: contact.location,
    email: contact.email,
    phone: contact.phone,
    skills,
    summary,
    experience,
    education,
    certifications,
    links,
  };
}

async function extractWithLlm(
  text: string,
  creds: LlmCredentials,
): Promise<CvData> {
  const system =
    "You are a CV/resume parser. Extract structured data and respond with STRICT JSON only, no prose.";
  const user = `Return JSON with this exact shape:
{
  "fullName": string,
  "headline": string,
  "location": string,
  "email": string,
  "phone": string,
  "skills": string[],
  "summary": string,
  "experience": [{"role": string, "company": string, "period": string}],
  "education": [{"school": string, "degree": string, "period": string}],
  "certifications": [{"name": string, "issuer": string, "period": string}],
  "links": string[]
}
Parse the CV below:
${text.slice(0, 12000)}`;

  return parseCvLlmOutput(await callChatJson(system, user, {}, creds));
}

export async function extractCv(
  text: string,
  creds?: LlmCredentials,
): Promise<{
  data: CvData;
  source: "ai" | "heuristic";
}> {
  const resolved = creds ? resolveCredentials(creds) : null;
  if (resolved) {
    try {
      return { data: await extractWithLlm(text, resolved), source: "ai" };
    } catch (err) {
      console.error(
        "[cv] LLM extraction failed, falling back to heuristic",
        err,
      );
    }
  } else if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    try {
      return {
        data: await extractWithLlm(text, resolveCredentials()!),
        source: "ai",
      };
    } catch (err) {
      console.error(
        "[cv] LLM extraction failed, falling back to heuristic",
        err,
      );
    }
  }
  return { data: heuristicCv(text), source: "heuristic" };
}

const DEBUG_LLM = process.env.NODE_ENV !== "production";

function redactedAuth(apiKey: string): string {
  if (!apiKey) return "(empty)";
  return `Bearer ${apiKey.slice(0, 4)}…(redacted)`;
}

export async function callChatJson(
  system: string,
  user: string,
  options: { timeoutMs?: number } = {},
  creds?: LlmCredentials,
): Promise<unknown> {
  const resolved = resolveCredentials(creds);
  if (!resolved) {
    throw new Error("LLM not configured");
  }
  const { baseUrl, apiKey, model } = resolved;
  const endpoint = `${baseUrl}/chat/completions`;
  const payload = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  if (DEBUG_LLM) {
    console.log("[llm:request]", {
      endpoint,
      model,
      auth: redactedAuth(apiKey),
      systemLength: system.length,
      userLength: user.length,
      userPreview: user.slice(0, 200),
    });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(options.timeoutMs ?? getLlmTimeoutMs()),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (DEBUG_LLM) {
      console.error("[llm:response:error]", {
        status: res.status,
        body: text.slice(0, 500),
      });
    }
    throw new Error(`LLM request failed: ${res.status}`);
  }

  const json = chatResponseSchema.parse(await res.json());
  const content = json.choices[0].message.content;
  if (DEBUG_LLM) {
    console.log("[llm:response:ok]", {
      status: res.status,
      contentLength: content.length,
      contentPreview: content.slice(0, 300),
    });
  }
  return JSON.parse(content);
}
