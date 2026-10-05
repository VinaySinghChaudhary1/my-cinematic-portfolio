"use client";
import dynamic from "next/dynamic";
import { Preloader } from "./Preloader";
import { CustomCursor } from "./CustomCursor";
import { SmoothScroll } from "./SmoothScroll";
import { OfflineBanner } from "./OfflineBanner";
import { ServiceWorker } from "./ServiceWorker";

const Galaxy = dynamic(() => import("./GalaxyBackground"), { ssr: false });

export function SiteChrome(p: {
  name: string;
  accent: string;
  accent2: string;
  preloader: boolean;
  background3D: boolean;
  cursor: boolean;
  smooth: boolean;
  grain: boolean;
}) {
  return (
    <>
      <Preloader name={p.name} enabled={p.preloader} />
      <SmoothScroll enabled={p.smooth} />
      <CustomCursor enabled={p.cursor} />
      {p.background3D ? (
        <Galaxy accent={p.accent} accent2={p.accent2} />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_60%)]" />
      )}
      <div className="vignette" aria-hidden />
      {p.grain && <div className="grain" aria-hidden />}
      <OfflineBanner />
      <ServiceWorker />
    </>
  );
}
