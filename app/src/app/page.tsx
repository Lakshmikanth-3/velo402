"use client";
/**
 * app/page.tsx — Velo402 Landing Page (Botanical Liquid Glass)
 *
 * Full-screen marketing landing page with:
 * - WebGL botanical shader background
 * - Three.js animated glass icosahedron
 * - Scroll-reveal sections
 * - Mouse parallax glass cards
 * - No sidebar (standalone layout)
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import ApproveWallDemo from "@/components/ApproveWallDemo";
import "./landing.css";
export default function LandingPage() {
  // ── Scroll reveal ────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Mouse parallax on glass cards ────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll<HTMLElement>(".glass-card-3d");
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      cards.forEach((card) => {
        card.style.transform = `perspective(1000px) rotateX(${y * 8}deg) rotateY(${-x * 8}deg) translateY(${y * -6}px)`;
      });
    };
    const handleMouseLeave = () => {
      const cards = document.querySelectorAll<HTMLElement>(".glass-card-3d");
      cards.forEach((card) => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="landing-root">


      {/* ── Top Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-left">
          <span className="landing-brand">Velo402</span>
          <div className="landing-nav-links">
            <Link href="/dashboard" className="landing-nav-link active">Mission Control</Link>
            <Link href="/provision" className="landing-nav-link">Provision</Link>
            <Link href="/marketplace" className="landing-nav-link">Knowledge</Link>
            <Link href="/trading" className="landing-nav-link">Trading Desk</Link>
            <Link href="/guardian" className="landing-nav-link">Guardian</Link>
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

      {/* ── Main content ── */}
      <main className="landing-main">

        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title text-glow">
              The Agentic Standard for <br />
              <span style={{ color: "var(--primary)" }}>Autonomous Finance</span>
            </h1>
            <p className="hero-subtitle">
              Precision engineering meets natural stability. Velo402 orchestrates
              institutional liquidity through a botanical-inspired neural framework on Sui.
            </p>
            <div className="hero-cta">
              <Link href="/dashboard" className="btn-launch">
                Launch Application
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>rocket_launch</span>
              </Link>
              <a
                href="https://github.com/Lakshmikanth-3/velo402"
                target="_blank"
                rel="noreferrer"
                className="btn-docs"
              >
                Read Docs
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>description</span>
              </a>
            </div>
          </div>


        </section>

        {/* ── Demo Split Screen ── */}
        <section className="demo-section scroll-reveal" style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
          <h2 className="section-title text-center mb-8">The Approve Wall vs. True Autonomy</h2>
          <ApproveWallDemo />
        </section>

        {/* ── Sovereign Intelligence ── */}
        <section className="section-sovereign">
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">Sovereign Intelligence</h2>
              <p className="section-subtitle">
                Our autonomous agents navigate the complexities of decentralized markets
                with the efficiency of a high-speed trading desk and the resilience of a
                natural ecosystem.
              </p>
            </div>
            <div className="live-badge">
              <div className="pulse-dot-landing" />
              <span>Live Network Processing</span>
            </div>
          </div>

          <div className="feature-grid">
            {[
              {
                icon: "neurology",
                title: "Autonomous Provisioning",
                desc: "Dynamic liquidity reallocation based on volatility curves and cross-protocol yields. Agents optimize capital efficiency in real-time.",
                delay: 0,
              },
              {
                icon: "monitoring",
                title: "Knowledge Synthesis",
                desc: "On-chain data analysis fused with external market signals to predict protocol health and institutional liquidity flows.",
                delay: 150,
              },
              {
                icon: "hub",
                title: "Trading Desk Core",
                desc: "Execution engine designed for low-latency atomic swaps and complex arbitrage loops across the Sui ecosystem.",
                delay: 300,
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="feature-card glass-card-3d scroll-reveal"
                style={{ transitionDelay: `${feat.delay}ms` }}
              >
                <div className="feature-icon-wrap">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "28px", color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}
                  >
                    {feat.icon}
                  </span>
                </div>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ecosystem protocols ── */}
        <section className="protocols-section">
          <div className="protocols-inner">
            <span className="protocols-label">Integrated Ecosystem Protocols</span>
            <div className="protocols-row">
              {[
                { icon: "waves", name: "CETUS" },
                { icon: "sailing", name: "SCALLOP" },
                { icon: "book_5", name: "DEEPBOOK" },
                { icon: "blur_on", name: "WALRUS" },
                { icon: "lock", name: "SEAL" },
              ].map((p) => (
                <div key={p.name} className="protocol-item">
                  <div className="protocol-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {p.icon}
                    </span>
                  </div>
                  <span className="protocol-name">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Institutional Security ── */}
        <section className="security-section">
          <div className="security-grid">
            <div className="scroll-reveal">
              <h2 className="section-title">Institutional Security</h2>
              <p className="section-subtitle" style={{ marginBottom: "2rem" }}>
                Velo402 implements a multi-layered security mesh. The Guardian service
                monitors protocol invariants 24/7, while the hardware-level Kill Switch
                ensures immediate capital safety.
              </p>

              <div className="security-cards">
                <div className="security-card glass-card-3d">
                  <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--secondary)" }}>
                    shield_lock
                  </span>
                  <div>
                    <h4 className="security-card-title">Guardian Protocol</h4>
                    <p className="security-card-desc">
                      AI-monitored circuit breakers that trigger defensive posture shifts
                      during abnormal market conditions.
                    </p>
                  </div>
                </div>
                <div className="security-card glass-card-3d" style={{ borderColor: "rgba(255,180,171,0.15)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--error)" }}>
                    emergency_home
                  </span>
                  <div>
                    <h4 className="security-card-title">Omni Kill Switch</h4>
                    <p className="security-card-desc">
                      A non-custodial emergency egress mechanism allowing users to withdraw
                      all assets to cold storage in one transaction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="security-visual scroll-reveal" style={{ transitionDelay: "200ms" }}>
              <div className="security-visual-glow" />
              <div className="security-visual-card glass-card-3d">
                <div className="security-visual-overlay" />
                {/* Synthetic visual instead of external image */}
                <div className="security-visual-content">
                  <div className="security-hex-ring">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="security-hex"
                        style={{ animationDelay: `${i * 0.3}s` }}
                      />
                    ))}
                    <div className="security-hex-core">
                      <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
                        verified_user
                      </span>
                    </div>
                  </div>
                  <div className="security-visual-label">
                    <span className="protocols-label" style={{ marginBottom: "0.25rem", display: "block" }}>
                      Safety Architecture
                    </span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--on-surface)" }}>
                      Velo Hardware Enclave
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="cta-section">
          <div className="cta-card glass-card-3d scroll-reveal">
            <h2 className="cta-title">
              Secure Your Autonomous <br />Financial Future.
            </h2>
            <div className="cta-buttons">
              <Link href="/dashboard" className="btn-launch" style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>
                Start Onboarding
              </Link>
              <button className="btn-docs" style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>
                Partner Inquiry
              </button>
            </div>
            <p className="cta-footnote">No Trust. Just Mathematics.</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-left">
          <span className="landing-footer-brand">Velo402</span>
          <span className="landing-footer-copy">
            © 2026 Velo402 · Sui Overflow Hackathon · Agentic Web Track
          </span>
        </div>
        <div className="landing-footer-links">
          {["Legal", "Privacy", "API Docs", "Status"].map((l) => (
            <a key={l} href="#" className="landing-footer-link">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

