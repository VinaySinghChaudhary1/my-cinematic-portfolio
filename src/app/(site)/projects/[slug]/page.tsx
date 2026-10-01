import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Calendar, User } from "lucide-react";
import { getProjectBySlug } from "@/lib/server/content";
import { Markdown } from "@/components/ui/Markdown";
import { Reveal } from "@/components/site/Reveal";
import { arr, formatRange, str, youtubeEmbed } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getProjectBySlug(slug);
  if (!r) return { title: "Project not found" };
  return {
    title: str(r.project.data.title),
    description: str(r.project.data.summary),
    openGraph: { images: str(r.project.data.cover) ? [str(r.project.data.cover)] : [] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const r = await getProjectBySlug(slug);
  if (!r) notFound();
  const d = r.project.data;
  const video = str(d.videoUrl) ? youtubeEmbed(str(d.videoUrl)) : null;
  return (
    <article className="relative z-10 pt-32 pb-24">
      <div className="container-x">
        <Link href={`/#${r.section.key}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> All projects
        </Link>
        <Reveal>
          <p className="eyebrow mt-10">{str(d.category) || "Project"}</p>
          <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold leading-[1] tracking-tight text-ink md:text-7xl">{str(d.title)}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">{str(d.summary)}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <dl className="mt-10 grid gap-6 border-y border-line py-6 sm:grid-cols-3">
            {str(d.role) && (
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
                  <User className="size-3.5" aria-hidden /> Role
                </dt>
                <dd className="mt-1 text-ink">{str(d.role)}</dd>
              </div>
            )}
            {(str(d.startDate) || str(d.endDate)) && (
              <div>
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
                  <Calendar className="size-3.5" aria-hidden /> Timeline
                </dt>
                <dd className="mt-1 text-ink">{formatRange(d.startDate, d.endDate, "Ongoing")}</dd>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {str(d.liveUrl) && (
                <a href={str(d.liveUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg">
                  Live demo <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
              {str(d.repoUrl) && (
                <a href={str(d.repoUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink">
                  Source code <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
            </div>
          </dl>
        </Reveal>
        {str(d.cover) && (
          <Reveal delay={0.15}>
            <img src={str(d.cover)} alt={`${str(d.title)} cover`} className="glow-border mt-12 w-full rounded-3xl border border-line object-cover" />
          </Reveal>
        )}
        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_280px]">
          <div>
            {video && (
              <div className="mb-10 aspect-video overflow-hidden rounded-2xl border border-line">
                <iframe src={video} title={`${str(d.title)} video`} className="size-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
            )}
            <Markdown>{str(d.description) || "_Case study coming soon._"}</Markdown>
            {arr(d.gallery).length > 0 && (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {arr(d.gallery).map((src, i) => (
                  <img key={i} src={src} alt={`${str(d.title)} screenshot ${i + 1}`} loading="lazy" className="w-full rounded-2xl border border-line" />
                ))}
              </div>
            )}
          </div>
          <aside>
            {arr(d.tech).length > 0 && (
              <div className="glass sticky top-28 rounded-2xl p-5">
                <h2 className="eyebrow">Tech stack</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {arr(d.tech).map((t) => (
                    <li key={t} className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
        <nav aria-label="More projects" className="mt-20 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          {r.prev ? (
            <Link href={`/projects/${r.prev.slug}`} className="group glass rounded-2xl p-5">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
                <ArrowLeft className="size-3.5" aria-hidden /> Previous
              </span>
              <span className="mt-1 block font-display text-xl text-ink group-hover:text-gradient">{r.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {r.next && (
            <Link href={`/projects/${r.next.slug}`} className="group glass rounded-2xl p-5 text-right">
              <span className="flex items-center justify-end gap-2 text-xs uppercase tracking-wider text-faint">
                Next <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-1 block font-display text-xl text-ink group-hover:text-gradient">{r.next.title}</span>
            </Link>
          )}
        </nav>
      </div>
    </article>
  );
}
