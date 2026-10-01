import { layoutsFor } from "./layouts";

/**
 * SECTION REGISTRY — the single source of truth for what every section can contain.
 *
 * The admin panel builds its forms from these field lists, the API validates input
 * against them, and the public site renders them. To add a new field to e.g. Projects,
 * add it here — the editor, validation and storage pick it up automatically.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "url"
  | "email"
  | "date"
  | "number"
  | "select"
  | "tags"
  | "boolean"
  | "image"
  | "images"
  | "file"
  | "color"
  | "layout";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string; description?: string; heavy?: boolean }[];
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  /** Shown as the item title in admin lists. */
  primary?: boolean;
  /** Secondary text in admin lists. */
  secondary?: boolean;
}

export interface SectionTypeDef {
  type: string;
  label: string;
  description: string;
  /** Fields for one item. Undefined = section has no item list (e.g. Contact). */
  itemFields?: FieldDef[];
  itemLabel?: string;
  /** Section-level settings (layout options, intro text…). */
  configFields: FieldDef[];
  defaultConfig: Record<string, unknown>;
}

const statusTimeline = [
  { value: "completed", label: "Completed" },
  { value: "ongoing", label: "Ongoing" },
  { value: "upcoming", label: "Upcoming" },
];

export const SECTION_TYPES: Record<string, SectionTypeDef> = {
  hero: {
    type: "hero",
    label: "Hero (3D intro)",
    description: "The cinematic first screen with your 3D portrait card, rotating roles and call-to-action buttons.",
    configFields: [
      { name: "greeting", label: "Greeting line", type: "text", maxLength: 80 },
      { name: "roles", label: "Rotating roles", type: "tags", help: "Each tag is shown in the typing animation." },
      { name: "primaryCtaLabel", label: "Primary button label", type: "text", maxLength: 40 },
      { name: "primaryCtaHref", label: "Primary button link", type: "text", help: "e.g. #projects or a full URL" },
      { name: "showResumeButton", label: "Show résumé download button", type: "boolean" },
      { name: "show3D", label: "Show interactive 3D portrait", type: "boolean" },
      { name: "portraitImages", label: "3D portrait photos", type: "images", help: "First photo is the front; second (optional) is shown on the back of the 3D card." },
      { name: "showScrollHint", label: "Show scroll hint", type: "boolean" },
    ],
    defaultConfig: { greeting: "Hello, I'm", roles: [], primaryCtaLabel: "View my work", primaryCtaHref: "#projects", showResumeButton: true, show3D: true, portraitImages: [], showScrollHint: true },
  },
  about: {
    type: "about",
    label: "About me",
    description: "Your story, a photo, quick facts and animated stat counters.",
    itemLabel: "Stat / highlight",
    itemFields: [
      { name: "label", label: "Label", type: "text", required: true, primary: true, maxLength: 60 },
      { name: "value", label: "Value (number)", type: "number", required: true, secondary: true },
      { name: "suffix", label: "Suffix", type: "text", placeholder: "+ or %", maxLength: 6 },
    ],
    configFields: [
      { name: "heading", label: "Heading", type: "text", maxLength: 120 },
      { name: "bio", label: "Biography", type: "markdown", maxLength: 6000 },
      { name: "photo", label: "About photo", type: "image" },
      { name: "photos", label: "Extra photos (slideshow)", type: "images" },
      { name: "facts", label: "Quick facts", type: "tags", help: "Short facts like “Based in Chennai”." },
      { name: "interests", label: "Interests & hobbies", type: "tags" },
    ],
    defaultConfig: { heading: "", bio: "", photo: "", photos: [], facts: [], interests: [] },
  },
  education: {
    type: "education",
    label: "Education",
    description: "Completed, ongoing and upcoming education on an animated timeline.",
    itemLabel: "Education entry",
    itemFields: [
      { name: "institution", label: "Institution", type: "text", required: true, primary: true, maxLength: 140 },
      { name: "degree", label: "Degree / programme", type: "text", required: true, secondary: true, maxLength: 140 },
      { name: "field", label: "Field of study", type: "text", maxLength: 140 },
      { name: "status", label: "Status", type: "select", options: statusTimeline, required: true },
      { name: "startDate", label: "Start", type: "date" },
      { name: "endDate", label: "End / expected", type: "date" },
      { name: "grade", label: "Grade / CGPA", type: "text", maxLength: 40 },
      { name: "location", label: "Location", type: "text", maxLength: 80 },
      { name: "logo", label: "Logo", type: "image" },
      { name: "description", label: "Description", type: "markdown", maxLength: 3000 },
      { name: "courses", label: "Key courses", type: "tags" },
      { name: "link", label: "Link", type: "url" },
    ],
    configFields: [],
    defaultConfig: {},
  },
  skills: {
    type: "skills",
    label: "Skills",
    description: "Skill categories with proficiency bars and an interactive 3D skill sphere.",
    itemLabel: "Skill",
    itemFields: [
      { name: "name", label: "Skill", type: "text", required: true, primary: true, maxLength: 50 },
      { name: "category", label: "Category", type: "text", required: true, secondary: true, maxLength: 50, placeholder: "Programming, Data, Tools…" },
      { name: "level", label: "Proficiency (0-100)", type: "number", min: 0, max: 100 },
      { name: "icon", label: "Icon (emoji or short text)", type: "text", maxLength: 8 },
      { name: "years", label: "Years of experience", type: "number", min: 0, max: 50 },
    ],
    configFields: [
      { name: "showSphere", label: "Show 3D skill sphere", type: "boolean" },
      { name: "showBars", label: "Show proficiency bars", type: "boolean" },
    ],
    defaultConfig: { showSphere: true, showBars: true },
  },
  projects: {
    type: "projects",
    label: "Projects",
    description: "Filterable, searchable project showcase with a full case-study page for each project.",
    itemLabel: "Project",
    itemFields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true, maxLength: 120 },
      { name: "slug", label: "URL slug", type: "text", help: "Leave empty to generate from the title.", maxLength: 80 },
      { name: "summary", label: "One-line summary", type: "textarea", required: true, secondary: true, maxLength: 300 },
      {
        name: "status", label: "Status", type: "select", required: true,
        options: [
          { value: "completed", label: "Completed" },
          { value: "in-progress", label: "In progress" },
          { value: "planned", label: "Planned (future project)" },
        ],
      },
      { name: "category", label: "Category", type: "text", maxLength: 50, placeholder: "Web, ML, Data…" },
      { name: "cover", label: "Cover image", type: "image" },
      { name: "gallery", label: "Screenshots / gallery", type: "images" },
      { name: "description", label: "Case study (Markdown)", type: "markdown", maxLength: 20000 },
      { name: "tech", label: "Tech stack", type: "tags" },
      { name: "role", label: "My role", type: "text", maxLength: 100 },
      { name: "startDate", label: "Start", type: "date" },
      { name: "endDate", label: "End", type: "date" },
      { name: "repoUrl", label: "Source code URL", type: "url" },
      { name: "liveUrl", label: "Live demo URL", type: "url" },
      { name: "videoUrl", label: "Video URL (YouTube etc.)", type: "url" },
    ],
    configFields: [
      { name: "showFilters", label: "Show category filters", type: "boolean" },
      { name: "showSearch", label: "Show search box", type: "boolean" },
      { name: "initialCount", label: "Projects shown before “Show more”", type: "number", min: 1, max: 60 },
    ],
    defaultConfig: { showFilters: true, showSearch: true, initialCount: 6 },
  },
  experience: {
    type: "experience",
    label: "Experience",
    description: "Internships, jobs, clubs, volunteering and leadership roles.",
    itemLabel: "Experience",
    itemFields: [
      { name: "role", label: "Role / title", type: "text", required: true, primary: true, maxLength: 120 },
      { name: "organization", label: "Organization", type: "text", required: true, secondary: true, maxLength: 120 },
      {
        name: "kind", label: "Type", type: "select",
        options: [
          { value: "internship", label: "Internship" },
          { value: "job", label: "Job" },
          { value: "freelance", label: "Freelance" },
          { value: "club", label: "Club / society" },
          { value: "volunteer", label: "Volunteering" },
          { value: "leadership", label: "Leadership" },
        ],
      },
      { name: "startDate", label: "Start", type: "date" },
      { name: "endDate", label: "End", type: "date", help: "Leave empty if current." },
      { name: "location", label: "Location", type: "text", maxLength: 80 },
      { name: "logo", label: "Logo", type: "image" },
      { name: "description", label: "Description", type: "markdown", maxLength: 4000 },
      { name: "skills", label: "Skills used", type: "tags" },
      { name: "link", label: "Link", type: "url" },
    ],
    configFields: [],
    defaultConfig: {},
  },
  certifications: {
    type: "certifications",
    label: "Certifications",
    description: "Uploaded certificates (image or PDF) with issuer filters and a full-screen viewer.",
    itemLabel: "Certificate",
    itemFields: [
      { name: "title", label: "Certificate title", type: "text", required: true, primary: true, maxLength: 160 },
      { name: "issuer", label: "Issuer", type: "text", required: true, secondary: true, maxLength: 120 },
      { name: "issueDate", label: "Issued", type: "date" },
      { name: "expiryDate", label: "Expires", type: "date" },
      { name: "credentialId", label: "Credential ID", type: "text", maxLength: 120 },
      { name: "credentialUrl", label: "Verification URL", type: "url" },
      { name: "image", label: "Certificate image", type: "image" },
      { name: "file", label: "Certificate PDF", type: "file" },
      { name: "skills", label: "Skills", type: "tags" },
    ],
    configFields: [{ name: "showFilters", label: "Show issuer filters", type: "boolean" }],
    defaultConfig: { showFilters: true },
  },
  achievements: {
    type: "achievements",
    label: "Achievements & awards",
    description: "A horizontally-scrolling cinematic reel of awards, ranks and milestones.",
    itemLabel: "Achievement",
    itemFields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true, maxLength: 140 },
      { name: "organization", label: "Awarded by / event", type: "text", secondary: true, maxLength: 120 },
      { name: "date", label: "Date", type: "date" },
      { name: "category", label: "Category", type: "text", maxLength: 50, placeholder: "Hackathon, Academic, Sports…" },
      { name: "description", label: "Description", type: "textarea", maxLength: 1000 },
      { name: "image", label: "Image", type: "image" },
      { name: "link", label: "Link", type: "url" },
    ],
    configFields: [{ name: "horizontalReel", label: "Cinematic horizontal scroll (desktop)", type: "boolean" }],
    defaultConfig: { horizontalReel: true },
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "Your photos in a draggable 3D ring carousel plus a full-screen viewer.",
    itemLabel: "Photo",
    itemFields: [
      { name: "image", label: "Photo", type: "image", required: true },
      { name: "caption", label: "Caption", type: "text", primary: true, maxLength: 160 },
      { name: "album", label: "Album", type: "text", secondary: true, maxLength: 60 },
      { name: "date", label: "Date", type: "date" },
    ],
    configFields: [],
    defaultConfig: {},
  },
  roadmap: {
    type: "roadmap",
    label: "Future & roadmap",
    description: "Upcoming education, future projects and goals — shown like a “coming soon” trailer.",
    itemLabel: "Goal",
    itemFields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true, maxLength: 140 },
      {
        name: "kind", label: "Type", type: "select", secondary: true,
        options: [
          { value: "education", label: "Education" },
          { value: "project", label: "Project" },
          { value: "skill", label: "Skill" },
          { value: "career", label: "Career" },
          { value: "personal", label: "Personal" },
        ],
      },
      { name: "targetDate", label: "Target date", type: "date" },
      {
        name: "status", label: "Status", type: "select",
        options: [
          { value: "planned", label: "Planned" },
          { value: "in-progress", label: "In progress" },
          { value: "done", label: "Done" },
        ],
      },
      { name: "progress", label: "Progress (0-100)", type: "number", min: 0, max: 100 },
      { name: "description", label: "Description", type: "textarea", maxLength: 1000 },
    ],
    configFields: [],
    defaultConfig: {},
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    description: "Recommendations from teachers, mentors and teammates. Only add real, permitted quotes.",
    itemLabel: "Testimonial",
    itemFields: [
      { name: "name", label: "Name", type: "text", required: true, primary: true, maxLength: 80 },
      { name: "role", label: "Role / relation", type: "text", secondary: true, maxLength: 120 },
      { name: "quote", label: "Quote", type: "textarea", required: true, maxLength: 1200 },
      { name: "avatar", label: "Photo", type: "image" },
      { name: "link", label: "Profile link", type: "url" },
    ],
    configFields: [],
    defaultConfig: {},
  },
  blog: {
    type: "blog",
    label: "Writing / blog",
    description: "Links to your articles, notes or talks (Medium, Hashnode, LinkedIn…).",
    itemLabel: "Article",
    itemFields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true, maxLength: 160 },
      { name: "excerpt", label: "Excerpt", type: "textarea", secondary: true, maxLength: 400 },
      { name: "url", label: "Article URL", type: "url" },
      { name: "date", label: "Published", type: "date" },
      { name: "cover", label: "Cover image", type: "image" },
      { name: "tags", label: "Tags", type: "tags" },
    ],
    configFields: [],
    defaultConfig: {},
  },
  contact: {
    type: "contact",
    label: "Contact",
    description: "A secure contact form (messages arrive in your admin inbox) plus your social links.",
    configFields: [
      { name: "heading", label: "Heading", type: "text", maxLength: 120 },
      { name: "text", label: "Intro text", type: "textarea", maxLength: 600 },
      { name: "showForm", label: "Show contact form", type: "boolean" },
      { name: "showEmail", label: "Show email address", type: "boolean" },
      { name: "availability", label: "Availability badge", type: "text", maxLength: 80, placeholder: "Open to internships" },
    ],
    defaultConfig: { heading: "Let's build something", text: "", showForm: true, showEmail: true, availability: "" },
  },
};

/* Every section gets a "Design / layout" picker as its first setting, built from the layout catalogue. */
for (const def of Object.values(SECTION_TYPES)) {
  const options = layoutsFor(def.type);
  if (!options.length) continue;
  def.configFields = [
    { name: "layout", label: "Design / layout", type: "layout", required: true, options },
    ...def.configFields.filter((f) => f.name !== "layout"),
  ];
  def.defaultConfig = { layout: options[0].value, ...def.defaultConfig };
}

export const SECTION_TYPE_LIST = Object.values(SECTION_TYPES);

export function getSectionType(type: string): SectionTypeDef | undefined {
  return SECTION_TYPES[type];
}
