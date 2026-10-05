/**
 * Bulk import helpers that don't touch the database (unit-tested):
 *   - a small RFC 4180 CSV parser (quotes, escaped quotes, newlines inside quotes, BOM)
 *   - LinkedIn "Download your data" CSVs → portfolio entries, mapped by section type
 *   - duplicate keys used to flag entries that already exist
 */

export type Row = Record<string, string>;

/** Parses CSV text into rows of cells. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Rows as objects. LinkedIn sometimes puts "Notes:" lines above the header, so the header is the first row
 * that contains `mustHave`.
 */
export function csvRecords(text: string, mustHave: string): Row[] {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === mustHave.toLowerCase()));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim());
  return rows.slice(h + 1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** "Jun 2023" → "2023-06", "2023" → "2023-01" (or -12 for an end date), "2023-06-01" → "2023-06", else "". */
export function liDate(v: string | undefined, end = false): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  let m = t.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[2]}-${MONTHS[m[1].toLowerCase()]}`;
  m = t.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{4})$/);
  if (m) return `${m[1]}-${end ? "12" : "01"}`;
  return "";
}

const thisMonth = () => new Date().toISOString().slice(0, 7);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s|\n/)[0] ?? "").trim();
const httpsOrEmpty = (u: string | undefined) => (/^https:\/\/\S+$/.test((u ?? "").trim()) ? (u ?? "").trim() : "");

export interface Candidate {
  /** Registry section type the entry belongs to (education, experience…). */
  type: string;
  data: Record<string, unknown>;
  /** Where it came from, e.g. "LinkedIn · Positions.csv" or "Résumé (AI)". */
  source: string;
}

function experienceKind(title: string): string {
  if (/\bintern(ship)?\b/i.test(title)) return "internship";
  if (/freelanc/i.test(title)) return "freelance";
  if (/volunteer/i.test(title)) return "volunteer";
  if (/\b(president|captain|lead|head|chair|secretary|coordinator)\b/i.test(title)) return "leadership";
  return "job";
}

/** LinkedIn data export (the CSV files, by file name) → candidate entries. Unknown files are ignored. */
export function mapLinkedIn(files: Record<string, string>): { candidates: Candidate[]; used: string[] } {
  const out: Candidate[] = [];
  const used: string[] = [];
  const get = (name: string) => {
    const k = Object.keys(files).find((f) => f.split("/").pop()!.toLowerCase() === name.toLowerCase());
    if (k) used.push(k.split("/").pop()!);
    return k ? files[k] : null;
  };
  const src = (f: string) => `LinkedIn · ${f}`;

  const positions = get("Positions.csv");
  if (positions)
    for (const r of csvRecords(positions, "Company Name")) {
      if (!r["Title"] && !r["Company Name"]) continue;
      out.push({
        type: "experience",
        source: src("Positions.csv"),
        data: {
          role: clip(r["Title"] || "Role", 120),
          organization: clip(r["Company Name"] || "", 120),
          kind: experienceKind(r["Title"] ?? ""),
          startDate: liDate(r["Started On"]),
          endDate: liDate(r["Finished On"], true),
          location: clip(r["Location"] ?? "", 80),
          description: clip(r["Description"] ?? "", 4000),
          skills: [],
          link: "",
        },
      });
    }

  const education = get("Education.csv");
  if (education)
    for (const r of csvRecords(education, "School Name")) {
      if (!r["School Name"]) continue;
      const end = liDate(r["End Date"], true);
      const start = liDate(r["Start Date"]);
      const status = !end ? "ongoing" : end > thisMonth() ? (start && start > thisMonth() ? "upcoming" : "ongoing") : "completed";
      const notes = [r["Notes"], r["Activities"] ? `Activities: ${r["Activities"]}` : ""].filter(Boolean).join("\n\n");
      out.push({
        type: "education",
        source: src("Education.csv"),
        data: {
          institution: clip(r["School Name"], 140),
          degree: clip(r["Degree Name"] || "", 140),
          field: "",
          status,
          startDate: start,
          endDate: end,
          grade: "",
          location: "",
          description: clip(notes, 3000),
          courses: [],
          link: "",
        },
      });
    }

  const skills = get("Skills.csv");
  if (skills)
    for (const r of csvRecords(skills, "Name")) {
      if (!r["Name"]) continue;
      out.push({ type: "skills", source: src("Skills.csv"), data: { name: clip(r["Name"], 50), category: "General", icon: "" } });
    }

  const certs = get("Certifications.csv");
  if (certs)
    for (const r of csvRecords(certs, "Name")) {
      if (!r["Name"]) continue;
      out.push({
        type: "certifications",
        source: src("Certifications.csv"),
        data: {
          title: clip(r["Name"], 160),
          issuer: clip(r["Authority"] ?? "", 120),
          issueDate: liDate(r["Started On"]),
          expiryDate: liDate(r["Finished On"], true),
          credentialId: clip(r["License Number"] ?? "", 120),
          credentialUrl: httpsOrEmpty(r["Url"]),
          skills: [],
        },
      });
    }

  const projects = get("Projects.csv");
  if (projects)
    for (const r of csvRecords(projects, "Title")) {
      if (!r["Title"]) continue;
      const desc = r["Description"] ?? "";
      const end = liDate(r["Finished On"], true);
      out.push({
        type: "projects",
        source: src("Projects.csv"),
        data: {
          title: clip(r["Title"], 120),
          slug: "",
          summary: clip(firstSentence(desc) || r["Title"], 300),
          status: end && end <= thisMonth() ? "completed" : "in-progress",
          category: "",
          description: clip(desc, 20000),
          tech: [],
          role: "",
          startDate: liDate(r["Started On"]),
          endDate: end,
          repoUrl: /github\.com|gitlab\.com/.test(r["Url"] ?? "") ? httpsOrEmpty(r["Url"]) : "",
          liveUrl: /github\.com|gitlab\.com/.test(r["Url"] ?? "") ? "" : httpsOrEmpty(r["Url"]),
          videoUrl: "",
        },
      });
    }

  const honors = get("Honors.csv");
  if (honors)
    for (const r of csvRecords(honors, "Title")) {
      if (!r["Title"]) continue;
      out.push({
        type: "achievements",
        source: src("Honors.csv"),
        data: { title: clip(r["Title"], 140), organization: clip(r["Issuer"] ?? "", 120), date: liDate(r["Issued On"]), category: "", description: clip(r["Description"] ?? "", 1000), link: "" },
      });
    }

  return { candidates: out, used: [...new Set(used)] };
}

/** Normalised text used to spot duplicates: "Google LLC" ≈ "google llc". */
export const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Two entries are the same when their main field matches and their second field matches (or one is empty). */
export function sameEntry(a: Record<string, unknown>, b: Record<string, unknown>, primary: string, secondary?: string): boolean {
  if (!norm(a[primary]) || norm(a[primary]) !== norm(b[primary])) return false;
  if (!secondary) return true;
  const x = norm(a[secondary]);
  const y = norm(b[secondary]);
  return !x || !y || x === y;
}

/** The CSV files the importer understands (so the browser only sends those out of a large ZIP). */
export const LINKEDIN_FILES = ["Positions.csv", "Education.csv", "Skills.csv", "Certifications.csv", "Projects.csv", "Honors.csv"];
