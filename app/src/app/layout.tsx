import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velo402 — Autonomous Agent Wallet",
  description:
    "Capability-scoped treasury for AI agents. PolicyCap-enforced budget, " +
    "HTTP 402 data payments, DeepBook trading — all without human signatures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            {/* Brand */}
            <Link href="/" className="nav-brand">
              <span className="nav-brand-glyph">⚡</span>
              <span>
                Velo<span style={{ color: "var(--accent-cyan)" }}>402</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="nav-links">
              <Link href="/" className="nav-link">
                Mission Control
              </Link>
              <Link href="/provision" className="nav-link">
                Provision
              </Link>
              <Link href="/marketplace" className="nav-link">
                Knowledge
              </Link>
              <Link href="/trading" className="nav-link">
                Trading Desk
              </Link>
              <Link href="/guardian" className="nav-link">
                Guardian
              </Link>
              <Link href="/kill-switch" className="nav-link kill-nav">
                🔴 Kill Switch
              </Link>
            </div>
          </div>
        </nav>

        <main style={{ padding: "2rem 0 4rem" }}>{children}</main>

        <footer
          style={{
            borderTop: "1px solid var(--border-subtle)",
            textAlign: "center",
            padding: "1.5rem",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          Velo402 · Sui Overflow 2026 · The Agentic Web Track ·{" "}
          <span
            style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}
          >
            PolicyCap enforces the math. Chain enforces the rest.
          </span>
        </footer>
      </body>
    </html>
  );
}
