/**
 * Domain checker logic (Admin → Move & domain). Network access is injected so the rules can be unit-tested:
 * `resolve` looks up DNS records, `probe` fetches https://host/api/health.
 */

export type CheckStatus = "ok" | "warn" | "fail" | "info";
export interface DomainCheck {
  id: string;
  group: "Website" | "Email" | "Google sign-in" | "Settings";
  label: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
}

export interface Probe {
  ok: boolean;
  status: number;
  site?: string;
  finalHost?: string;
  error?: string;
}

export interface DomainDeps {
  resolve: (type: "A" | "AAAA" | "CNAME" | "TXT", name: string) => Promise<string[]>;
  probe: (url: string) => Promise<Probe>;
  me: { fingerprint: string; siteUrl: string; email: boolean; google: boolean; emailFrom: string };
}

export function normalizeHost(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z]+:\/\//.test(s)) s = `https://${s}`;
  try {
    const h = new URL(s).hostname.replace(/\.$/, "");
    return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ? h : null;
  } catch {
    return null;
  }
}

/** Which host DNS points to, from well-known values. */
export function guessProvider(a: string[], cname: string[]): string | null {
  const all = [...a, ...cname].map((x) => x.toLowerCase().replace(/\.$/, ""));
  if (all.some((x) => x === "76.76.21.21" || x.endsWith("vercel-dns.com") || x.endsWith("vercel.app"))) return "Vercel";
  if (all.some((x) => x.endsWith("netlify.app") || x === "75.2.60.5")) return "Netlify";
  if (all.some((x) => x.endsWith("onrender.com") || x === "216.24.57.1")) return "Render";
  if (all.some((x) => x.endsWith("railway.app"))) return "Railway";
  if (all.some((x) => x.endsWith("fly.dev"))) return "Fly.io";
  if (all.some((x) => x.endsWith("github.io") || /^185\.199\.(108|109|110|111)\.153$/.test(x))) return "GitHub Pages";
  return null;
}

const apex = (host: string) => host.replace(/^www\./, "");

export async function checkDomain(input: string, d: DomainDeps): Promise<{ host: string; checks: DomainCheck[] }> {
  const host = normalizeHost(input);
  if (!host) throw new Error("Enter a domain like yourname.com");
  const base = apex(host);
  const checks: DomainCheck[] = [];
  let lookupFailures = 0;
  const safe = (p: Promise<string[]>) =>
    p.catch(() => {
      lookupFailures++;
      return [] as string[];
    });

  // ── Website ──
  const [a, aaaa, cname, wwwA, wwwCname] = await Promise.all([
    safe(d.resolve("A", base)),
    safe(d.resolve("AAAA", base)),
    safe(d.resolve("CNAME", base)),
    safe(d.resolve("A", `www.${base}`)),
    safe(d.resolve("CNAME", `www.${base}`)),
  ]);
  const provider = guessProvider([...a, ...aaaa], cname);
  const dnsDown = lookupFailures >= 5;
  if (dnsDown) {
    checks.push({ id: "dns", group: "Website", label: "DNS lookup", status: "info", detail: "This server couldn't query DNS right now, so DNS records can't be checked. The HTTPS test below still works — try again in a minute." });
  } else if (!a.length && !aaaa.length && !cname.length) {
    checks.push({ id: "dns", group: "Website", label: "Domain points somewhere", status: "fail", detail: `${base} has no A/AAAA/CNAME record yet.`, fix: "At your registrar (e.g. Namecheap → Advanced DNS) add the A record your host shows (Vercel: A @ → 76.76.21.21)." });
  } else {
    checks.push({
      id: "dns",
      group: "Website",
      label: "Domain points somewhere",
      status: "ok",
      detail: `${base} → ${[...a, ...aaaa, ...cname].join(", ")}${provider ? ` (${provider})` : ""}`,
    });
  }
  if (!dnsDown)
  checks.push(
    wwwA.length || wwwCname.length
      ? { id: "www", group: "Website", label: "www address", status: "ok", detail: `www.${base} → ${[...wwwCname, ...wwwA].join(", ")}` }
      : { id: "www", group: "Website", label: "www address", status: "warn", detail: `www.${base} has no record, so visitors typing “www.” get an error.`, fix: `Add CNAME www → ${base}. (or the value your host shows).` },
  );

  const p = await d.probe(`https://${base}/api/health`);
  if (!p.ok) {
    checks.push({
      id: "https",
      group: "Website",
      label: "Opens over HTTPS",
      status: "fail",
      detail: p.error ? `Could not open https://${base}: ${p.error}` : `https://${base}/api/health answered ${p.status}.`,
      fix: "If you just changed DNS, wait 5–60 minutes. Make sure the domain is added in your host's Domains settings so it can issue the HTTPS certificate.",
    });
  } else if (p.site && p.site === d.me.fingerprint) {
    checks.push({ id: "https", group: "Website", label: "Opens THIS site", status: "ok", detail: `https://${base} reaches this exact site (same database).` });
  } else if (p.site) {
    checks.push({
      id: "https",
      group: "Website",
      label: "Opens THIS site",
      status: "warn",
      detail: `https://${base} opens another copy of this portfolio (probably the old host).`,
      fix: "That is expected before you switch DNS. Once the new host is ready, point the domain's DNS to it.",
    });
  } else {
    checks.push({ id: "https", group: "Website", label: "Opens THIS site", status: "warn", detail: `https://${base} opens a website, but not this portfolio (or an older version of it).`, fix: "Point the domain's DNS to this host." });
  }

  // ── Settings ──
  let siteHost = "";
  try {
    siteHost = apex(new URL(d.me.siteUrl).hostname);
  } catch {
    /* none */
  }
  checks.push(
    siteHost === base
      ? { id: "address", group: "Settings", label: "Website address setting", status: "ok", detail: `This site's address is ${d.me.siteUrl}.` }
      : {
          id: "address",
          group: "Settings",
          label: "Website address setting",
          status: "warn",
          detail: `This site's address is ${d.me.siteUrl}, not ${base}. Emails, Google sign-in and the sitemap use the address.`,
          fix: `When ${base} opens this site, set Website address to https://${base} (on this page).`,
        },
  );

  // ── Email (Resend) ──
  if (d.me.email && dnsDown) {
    checks.push({ id: "email", group: "Email", label: "Email records", status: "info", detail: "Skipped — DNS couldn't be queried from this server." });
  } else if (d.me.email) {
    const [dkim, send, dmarc] = await Promise.all([safe(d.resolve("TXT", `resend._domainkey.${base}`)), safe(d.resolve("CNAME", `send.${base}`)), safe(d.resolve("TXT", `_dmarc.${base}`))]);
    const sendTxt = send.length ? send : await safe(d.resolve("TXT", `send.${base}`));
    checks.push(
      dkim.some((t) => t.includes("p="))
        ? { id: "dkim", group: "Email", label: "DKIM (resend._domainkey)", status: "ok", detail: "Found." }
        : { id: "dkim", group: "Email", label: "DKIM (resend._domainkey)", status: "fail", detail: "Missing — emails from this domain will be refused.", fix: "Resend → Domains → add this domain → copy the TXT record to your DNS." },
      sendTxt.length
        ? { id: "spf", group: "Email", label: "Sending records (send.)", status: "ok", detail: `Found: ${sendTxt[0].slice(0, 60)}` }
        : { id: "spf", group: "Email", label: "Sending records (send.)", status: "fail", detail: "Missing.", fix: "Copy the send / rsend records from Resend → Domains to your DNS." },
      dmarc.some((t) => t.toLowerCase().startsWith("v=dmarc1"))
        ? { id: "dmarc", group: "Email", label: "DMARC", status: "ok", detail: dmarc[0] }
        : { id: "dmarc", group: "Email", label: "DMARC", status: "warn", detail: "Missing (optional, helps emails avoid spam).", fix: "Add TXT _dmarc → v=DMARC1; p=none;" },
    );
    const fromHost = /@([^>\s]+)/.exec(d.me.emailFrom)?.[1]?.toLowerCase();
    if (fromHost && apex(fromHost) !== base)
      checks.push({ id: "from", group: "Email", label: "Sender address", status: "info", detail: `Emails are sent from ${fromHost}. If you retire that domain, verify ${base} in Resend and change EMAIL_FROM.` });
  } else {
    checks.push({ id: "email", group: "Email", label: "Email", status: "info", detail: "Email is not set up on this host (RESEND_API_KEY), so nothing to check." });
  }

  // ── Google ──
  if (d.me.google) {
    checks.push({
      id: "google",
      group: "Google sign-in",
      label: "Allowed addresses in Google Cloud",
      status: "info",
      detail: `Google Cloud → Clients → your Web client must list origin https://${base} and redirect URI https://${base}/api/auth/google/callback. Google doesn't let sites check this from outside — add both before switching.`,
    });
  }
  return { host: base, checks };
}
