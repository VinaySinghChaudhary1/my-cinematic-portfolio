"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#05040b", color: "#eeedf9", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>The site failed to load</h1>
          <p style={{ color: "#a3a1c2" }}>Please refresh the page. If the problem continues, try again later.</p>
          {error.digest && <p style={{ color: "#6f6d8f", fontSize: 12 }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#eeedf9", color: "#05040b", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
