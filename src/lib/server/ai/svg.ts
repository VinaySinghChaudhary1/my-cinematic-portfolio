/**
 * AI-written SVG is untrusted. It is (1) sanitised with an allow-list and (2) converted to a WebP image,
 * so the site only ever serves a plain bitmap — no SVG with scripts can reach a visitor.
 */
import { AiError } from "./providers";

const TAGS = new Set(
  "svg g path rect circle ellipse line polyline polygon defs lineargradient radialgradient stop text tspan title desc clippath mask pattern filter fegaussianblur feoffset femerge femergenode fecolormatrix feblend feflood fecomposite fedropshadow".split(" "),
);

export function sanitizeSvg(input: string): string {
  let s = input.trim().replace(/^```(?:svg|xml)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.search(/<svg[\s>]/i);
  const end = s.toLowerCase().lastIndexOf("</svg>");
  if (start < 0 || end < 0) throw new AiError("The AI didn't return an SVG drawing. Try again.", "bad_output");
  s = s.slice(start, end + 6);
  s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<\?[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  // drop disallowed elements entirely (with their content)
  s = s.replace(/<(script|style|foreignobject|image|use|a|iframe|object|embed|animate\w*|set)\b[\s\S]*?(<\/\1\s*>|\/>)/gi, "");
  s = s.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (tag, rawName: string, attrs: string) => {
    const nm = rawName.toLowerCase();
    if (!TAGS.has(nm)) return "";
    if (tag.startsWith("</")) return `</${rawName}>`;
    const kept: string[] = [];
    for (const m of attrs.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g)) {
      const an = m[1].toLowerCase();
      const val = m[2].slice(1, -1);
      if (an.startsWith("on")) continue;
      if ((an === "href" || an === "xlink:href") && !val.startsWith("#")) continue;
      if (/javascript:|data:|expression\(|@import/i.test(val)) continue;
      if (/url\(/i.test(val) && !/^url\(#[\w-]+\)$/.test(val.trim()) && !/url\(\s*#/.test(val)) continue;
      kept.push(`${m[1]}="${val.replace(/"/g, "&quot;")}"`);
    }
    if (nm === "svg" && !kept.some((k) => k.startsWith("xmlns="))) kept.push('xmlns="http://www.w3.org/2000/svg"');
    return `<${rawName}${kept.length ? " " + kept.join(" ") : ""}${tag.endsWith("/>") ? "/" : ""}>`;
  });
  if (s.length > 200_000) throw new AiError("The SVG is too large.", "bad_output");
  return s;
}

type SharpFn = (input: Buffer, opts?: { density?: number }) => {
  resize: (w: number, h: number, o: Record<string, unknown>) => { webp: (o: Record<string, unknown>) => { toBuffer: () => Promise<Buffer> } };
};

async function loadSharp(): Promise<SharpFn> {
  try {
    const mod = (await import("sharp")) as unknown as { default: SharpFn };
    return mod.default;
  } catch {
    throw new AiError('Converting drawings needs the "sharp" package. Run: npm install sharp', "unsupported", 500);
  }
}

/** SVG → WebP of the given size (transparent background). */
export async function svgToWebp(svg: string, width: number, height: number): Promise<Uint8Array> {
  const sharp = await loadSharp();
  try {
    const out = await sharp(Buffer.from(svg), { density: 192 }).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new AiError("The AI drawing couldn't be converted (invalid SVG). Try again.", "bad_output");
  }
}

/** Any generated photo → WebP, max side 1600 px. */
export async function toWebp(bytes: Uint8Array, maxSide = 1600): Promise<Uint8Array> {
  const sharp = await loadSharp();
  const out = await sharp(Buffer.from(bytes)).resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  return new Uint8Array(out);
}
