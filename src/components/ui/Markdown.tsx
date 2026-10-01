import ReactMarkdown from "react-markdown";
import { isSafeUrl } from "@/lib/validation";

/** Safe Markdown: raw HTML is never rendered and unsafe link protocols are stripped. */
export function Markdown({ children, className = "prose-dark" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        skipHtml
        urlTransform={(url) => (isSafeUrl(url) ? url : "")}
        components={{
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (typeof src === "string" ? <img src={src} alt={alt ?? ""} loading="lazy" className="rounded-xl" /> : null),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
