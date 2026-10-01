import type { FieldDef } from "./registry";

export interface SettingsGroup {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
}

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "x",
  "instagram",
  "youtube",
  "leetcode",
  "kaggle",
  "medium",
  "website",
] as const;

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    key: "profile",
    label: "Profile",
    description: "Who you are — used across the hero, navbar, footer and SEO.",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 80 },
      { name: "initials", label: "Logo initials", type: "text", maxLength: 4 },
      { name: "headline", label: "Headline", type: "text", maxLength: 140, placeholder: "BS Data Science · IIT Madras" },
      { name: "tagline", label: "Tagline", type: "textarea", maxLength: 300 },
      { name: "email", label: "Public email", type: "email" },
      { name: "location", label: "Location", type: "text", maxLength: 80 },
      { name: "avatar", label: "Avatar / profile photo", type: "image" },
      { name: "resume", label: "Résumé (PDF)", type: "file" },
    ],
  },
  {
    key: "socials",
    label: "Social links",
    description: "Leave a field empty to hide that icon.",
    fields: [
      { name: "github", label: "GitHub", type: "url" },
      { name: "linkedin", label: "LinkedIn", type: "url" },
      { name: "x", label: "X / Twitter", type: "url" },
      { name: "instagram", label: "Instagram", type: "url" },
      { name: "youtube", label: "YouTube", type: "url" },
      { name: "leetcode", label: "LeetCode", type: "url" },
      { name: "kaggle", label: "Kaggle", type: "url" },
      { name: "medium", label: "Medium / blog", type: "url" },
      { name: "website", label: "Other website", type: "url" },
    ],
  },
  {
    key: "appearance",
    label: "Appearance & effects",
    description: "Colours and cinematic effects. Visitors who prefer reduced motion always get a calm version.",
    fields: [
      { name: "accent", label: "Primary accent", type: "color" },
      { name: "accent2", label: "Secondary accent", type: "color" },
      { name: "preloader", label: "Cinematic intro preloader", type: "boolean" },
      { name: "background3D", label: "3D particle galaxy background", type: "boolean" },
      { name: "customCursor", label: "Glowing custom cursor (desktop)", type: "boolean" },
      { name: "smoothScroll", label: "Smooth scrolling", type: "boolean" },
      { name: "filmGrain", label: "Film-grain overlay", type: "boolean" },
    ],
  },
  {
    key: "seo",
    label: "SEO & sharing",
    description: "How the site appears on Google, LinkedIn and WhatsApp previews.",
    fields: [
      { name: "title", label: "Page title", type: "text", maxLength: 70 },
      { name: "description", label: "Meta description", type: "textarea", maxLength: 170 },
      { name: "keywords", label: "Keywords", type: "tags" },
      { name: "ogImage", label: "Share image (1200×630)", type: "image" },
      { name: "indexable", label: "Allow search engines to index the site", type: "boolean" },
    ],
  },
  {
    key: "footer",
    label: "Footer",
    description: "",
    fields: [
      { name: "text", label: "Footer note", type: "text", maxLength: 160 },
      { name: "showBuiltWith", label: "Show “built with” line", type: "boolean" },
      { name: "showAdminLink", label: "Show a small “Admin” sign-in link in the footer", type: "boolean", help: "Off by default — you can always sign in at /admin." },
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance mode",
    description: "When on, visitors see a maintenance screen. You (logged in) still see the full site.",
    fields: [
      { name: "enabled", label: "Maintenance mode ON", type: "boolean" },
      { name: "message", label: "Message for visitors", type: "textarea", maxLength: 400 },
    ],
  },
  {
    key: "privacy",
    label: "Privacy notice",
    description:
      "The contact form collects names and emails, so a privacy notice is recommended. Fill in the real details, then publish. Have it reviewed if you are unsure.",
    fields: [
      { name: "published", label: "Publish the privacy page", type: "boolean" },
      { name: "effectiveDate", label: "Effective date", type: "date" },
      { name: "content", label: "Privacy notice (Markdown)", type: "markdown", maxLength: 20000 },
    ],
  },
];

export type SiteSettings = {
  profile: { name: string; initials: string; headline: string; tagline: string; email: string; location: string; avatar: string; resume: string };
  socials: Record<(typeof SOCIAL_PLATFORMS)[number], string>;
  appearance: { accent: string; accent2: string; preloader: boolean; background3D: boolean; customCursor: boolean; smoothScroll: boolean; filmGrain: boolean };
  seo: { title: string; description: string; keywords: string[]; ogImage: string; indexable: boolean };
  footer: { text: string; showBuiltWith: boolean; showAdminLink: boolean };
  maintenance: { enabled: boolean; message: string };
  privacy: { published: boolean; effectiveDate: string; content: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  profile: { name: "Your Name", initials: "YN", headline: "", tagline: "", email: "", location: "", avatar: "", resume: "" },
  socials: { github: "", linkedin: "", x: "", instagram: "", youtube: "", leetcode: "", kaggle: "", medium: "", website: "" },
  appearance: { accent: "#8b5cf6", accent2: "#22d3ee", preloader: true, background3D: true, customCursor: true, smoothScroll: true, filmGrain: true },
  seo: { title: "", description: "", keywords: [], ogImage: "", indexable: false },
  footer: { text: "", showBuiltWith: true, showAdminLink: false },
  maintenance: { enabled: false, message: "We're polishing a few things. Please check back soon." },
  privacy: { published: false, effectiveDate: "", content: "" },
};
