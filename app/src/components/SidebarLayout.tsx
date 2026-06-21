"use client";
/**
 * SidebarLayout.tsx  (now TopNavLayout)
 * Full-width glassmorphic top navigation for all inner app pages.
 * Routes: /dashboard, /provision, /marketplace, /trading, /guardian, /kill-switch
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalStatsTicker from "./GlobalStatsTicker";
import "../app/landing.css";

const NAV = [
  { href: "/dashboard",   label: "Mission Control" },
  { href: "/provision",   label: "Provision" },
  { href: "/marketplace", label: "Knowledge" },
  { href: "/trading",     label: "Trading Desk" },
  { href: "/guardian",    label: "Guardian" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Top Nav (Identical to Landing Page) ── */}
      <nav className="landing-nav">
        <div className="landing-nav-left">
          <Link href="/" className="landing-brand" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Velo402</Link>
          <div className="landing-nav-links">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`landing-nav-link${pathname === item.href || pathname.startsWith(item.href + "/") ? " active" : ""}`}
                style={pathname === item.href || pathname.startsWith(item.href + "/") ? { opacity: 1, color: 'var(--primary)', fontWeight: 'bold' } : {}}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="landing-nav-right">
          <button 
            className="landing-btn-ghost"
            onClick={() => alert("Velo402 is an Autonomous Agent. You do not need to connect a browser wallet to sign transactions. Click 'Launch Application' to view the Mission Control dashboard.")}
          >
            Connect Wallet
          </button>
          <Link href="/kill-switch" className="landing-btn-kill">Kill Switch</Link>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="app-main">
        <div className="page-content" style={{ paddingBottom: '6rem' }}>{children}</div>
      </main>

      {/* ── Fixed Footer Status Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 23, 17, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--glass-border)',
        padding: '0.75rem 2rem',
        zIndex: 9999
      }}>
        <GlobalStatsTicker />
      </div>
    </>
  );
}
