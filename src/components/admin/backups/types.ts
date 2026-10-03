export interface BackupOptions {
  sections: "all" | string[];
  settings: boolean;
  media: boolean;
  bundled: boolean;
  messages: boolean;
  audit: boolean;
}

export interface BackupRecord {
  id: string;
  kind: "manual" | "scheduled" | "pre-restore" | "uploaded" | "cli";
  label: string;
  size: number;
  protected: boolean;
  createdAt: number;
  summary: {
    appVersion?: string;
    options?: BackupOptions;
    counts?: { sections: number; items: number; settings: number; media: number; bundled: number; messages: number; audit: number };
    warnings?: string[];
    siteUrl?: string;
    createdAt?: string;
  };
}

export interface BackupConfig {
  schedule: { enabled: boolean; frequency: "daily" | "weekly" | "monthly"; keep: number; options: BackupOptions };
  lastRun: { at: number; ok: boolean; message: string; backupId?: string } | null;
}

export interface Platform {
  storage: "local" | "blob" | "s3";
  ephemeral: boolean;
  scheduler: "internal" | "vercel-cron" | "external";
  cronSecretSet: boolean;
  dedicatedSecret: boolean;
}

export interface SectionInfo {
  key: string;
  title: string;
  type: string;
}

export interface Preview {
  manifest: { createdAt: string; appVersion: string; siteUrl: string; kind: string; label: string; counts: NonNullable<BackupRecord["summary"]["counts"]>; warnings: string[] };
  sections: { key: string; type: string; title: string; backupItems: number; currentItems: number | null; enabled: boolean }[];
  removedIfAll: { key: string; title: string }[];
  settingsGroups: string[];
  media: { total: number; alreadyHere: number };
  bundled: { total: number; missingHere: number };
  messages: { total: number; new: number };
}

export interface RestoreReport {
  snapshotId: string;
  sections: number;
  items: number;
  settingsGroups: number;
  mediaAdded: number;
  mediaReused: number;
  bundledUploaded: number;
  messagesAdded: number;
  warnings: string[];
}

export const KIND_LABEL: Record<BackupRecord["kind"], string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  "pre-restore": "Auto snapshot",
  uploaded: "Uploaded",
  cli: "Command line",
};
