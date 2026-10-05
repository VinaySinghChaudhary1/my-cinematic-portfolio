/**
 * Who is looking at the public site, and what may they see?
 *   public  → published, public sections only (maintenance page while maintenance is on)
 *   tester  → also beta-only sections and the site during maintenance; drafts if allowed + preview switched on
 *   admin   → everything; drafts when preview is switched on
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";
import { getCurrentTester } from "./tester-auth";

export const PREVIEW_COOKIE = "pf_preview";
export type SiteMode = "public" | "beta" | "preview";

export interface Viewer {
  kind: "public" | "tester" | "admin";
  name: string;
  canPreview: boolean;
  previewOn: boolean;
  mode: SiteMode;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const previewCookie = (await cookies()).get(PREVIEW_COOKIE)?.value === "1";
  const admin = await getCurrentUser();
  if (admin) return { kind: "admin", name: admin.name || admin.email, canPreview: true, previewOn: previewCookie, mode: previewCookie ? "preview" : "beta" };
  const tester = await getCurrentTester();
  if (tester) {
    const on = tester.canSeeDrafts && previewCookie;
    return { kind: "tester", name: tester.name, canPreview: tester.canSeeDrafts, previewOn: on, mode: on ? "preview" : "beta" };
  }
  return { kind: "public", name: "", canPreview: false, previewOn: false, mode: "public" };
});
