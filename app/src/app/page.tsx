"use client";
/**
 * app/page.tsx — Mission Control (Home)
 *
 * Live dashboard showing:
 * - PolicyCap gauge (budget used / remaining / expiry)
 * - Treasury balance
 * - Live audit event feed via SSE
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SCOPE_LABEL, ACTION_LABEL, mistToSui } from "@/lib/velo-constants";

interface PolicyStatus {
  policy: {
    id: string;
    exists: boolean;
    maxSpend: string;
    currentSpend: string;
    remainingBudget: string;
    expirationEpoch: number;
    allowedScopes: number[];
    attestedComputeRequired: boolean;
  };
  treasury: { balanceMist: string; label: string; id: string };
  currentEpoch: number;
  epochsRemaining: number;
}

interface AuditEvent {
  key: string;
  ts: number;
  txDigest: string;
  eventType: string;
  parsedJson: Record<string, unknown>;
}

export default function MissionControlPage() {
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch policy status on mount + every 10 s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/policy/status");
        if (res.ok) setStatus(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  // SSE audit feed
  useEffect(() => {
    const es = new EventSource("/api/audit/stream");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "event") {
        setEvents((prev) =>
          [
            {
              key: `${data.txDigest}-${data.timestampMs}`,
              ts: Number(data.timestampMs ?? Date.now()),
              txDigest: data.txDigest,
              eventType: data.eventType,
              parsedJson: data.parsedJson ?? {},
            },
            ...prev,
          ].slice(0, 200),
        );
      }
    };

    return () => es.close();
  }, []);

  // Auto-scroll terminal to top on new event
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [events.length]);

  const p = status?.policy;
  const t = status?.treasury;

  const pctUsed = p
    ? Math.round((Number(p.currentSpend) / Number(p.maxSpend)) * 100)
    : 0;
  const barColor = pctUsed > 90 ? "red" : pctUsed > 65 ? "amber" : "emerald";

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }} className="fade-up">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <h1>Mission Control</h1>
          <span className={`pulse-dot ${connected ? "live" : "idle"}`} />
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            {connected ? "Live feed" : "Connecting…"}
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Real-time view of your agent's financial authority and on-chain
          activity.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
          Loading chain state…
        </div>
      ) : (
        <>
          {/* Stat row */}
          <div
            className="stat-grid fade-up-2"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="stat-card">
              <div className="stat-label">Treasury Balance</div>
              <div
                className="stat-value mono"
                style={{ color: "var(--accent-cyan)" }}
              >
                {t ? mistToSui(t.balanceMist) : "—"} SUI
              </div>
              <div className="stat-sub">{t?.label ?? "—"}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Budget Used</div>
              <div
                className="stat-value mono"
                style={{
                  color:
                    pctUsed > 90 ? "var(--accent-kill)" : "var(--text-primary)",
                }}
              >
                {p ? `${mistToSui(p.currentSpend)} SUI` : "—"}
              </div>
              <div className="stat-sub">{pctUsed}% of cap</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Remaining Budget</div>
              <div
                className="stat-value mono"
                style={{ color: "var(--accent-emerald)" }}
              >
                {p ? `${mistToSui(p.remainingBudget)} SUI` : "—"}
              </div>
              <div className="stat-sub">Hard ceiling enforced on-chain</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Epoch Expiry</div>
              <div className="stat-value mono">
                {p ? p.expirationEpoch : "—"}
              </div>
              <div className="stat-sub">
                {status ? `${status.epochsRemaining} epochs remaining` : "—"}
              </div>
            </div>
          </div>

          {/* PolicyCap gauge */}
          <div
            className="card glow-cyan fade-up-3"
            style={{ marginBottom: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3>PolicyCap State</h3>
                {p?.id && (
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    {p.id}
                  </div>
                )}
              </div>
              {p?.exists ? (
                <span className="badge badge-emerald">Active</span>
              ) : (
                <span className="badge badge-red">Revoked / Not Set</span>
              )}
            </div>

            {/* Budget bar */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                <span>{p ? mistToSui(p.currentSpend) : "0"} SUI spent</span>
                <span>{p ? mistToSui(p.maxSpend) : "0"} SUI cap</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${barColor}`}
                  style={{ width: `${pctUsed}%` }}
                />
              </div>
            </div>

            {/* Allowed scopes */}
            <div>
              <div className="label" style={{ marginBottom: "0.6rem" }}>
                Authorized Scopes
              </div>
              <div className="scope-grid">
                {p?.allowedScopes?.map((s) => (
                  <span key={s} className={`scope-chip active-${s}`}>
                    {SCOPE_LABEL[s] ?? `Scope ${s}`}
                  </span>
                )) ?? (
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}
                  >
                    No scopes
                  </span>
                )}
              </div>
            </div>

            {p?.attestedComputeRequired && (
              <div style={{ marginTop: "0.75rem" }}>
                <span className="badge badge-violet">
                  🔒 Nautilus Attestation Required
                </span>
              </div>
            )}
          </div>

          {/* Live audit feed */}
          <div className="card fade-up-3">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3>Live Audit Feed</h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span className={`pulse-dot ${connected ? "live" : "idle"}`} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {events.length} events
                </span>
              </div>
            </div>

            <div className="terminal" ref={feedRef}>
              {events.length === 0 ? (
                <div className="term-line">
                  <span className="term-tag system">SYSTEM</span>
                  <span className="term-msg">Waiting for agent activity…</span>
                </div>
              ) : (
                events.map((evt) => <AuditLine key={evt.key} event={evt} />)
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <Link href="/provision" className="btn btn-primary">
              + Provision Agent
            </Link>
            <Link href="/trading" className="btn btn-ghost">
              View Trading Desk
            </Link>
            <Link
              href="/kill-switch"
              className="btn"
              style={{
                background: "var(--accent-kill-g)",
                color: "var(--accent-kill)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              🔴 Kill Switch
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function AuditLine({ event }: { event: AuditEvent }) {
  const pj = event.parsedJson as any;
  const actionType = (pj?.action_type as string | undefined) ?? "";
  const label = ACTION_LABEL[actionType] ?? actionType;
  const amount = pj?.amount ? `${mistToSui(pj.amount)} SUI` : "";
  const counterparty = pj?.counterparty
    ? `→ ${String(pj.counterparty).slice(0, 12)}…`
    : "";

  const tagClass = actionType.includes("402")
    ? "data"
    : actionType.includes("SPOT")
      ? "spot"
      : actionType.includes("MARGIN")
        ? "margin"
        : actionType.includes("PREDICT")
          ? "predict"
          : actionType.includes("REVOKE")
            ? "revoke"
            : "system";

  const tagText = actionType.includes("402")
    ? "402"
    : actionType.includes("SPOT")
      ? "SPOT"
      : actionType.includes("MARGIN")
        ? "MARGIN"
        : actionType.includes("PREDICT")
          ? "PREDICT"
          : actionType.includes("REVOKE")
            ? "REVOKE"
            : "SYS";

  const ts = new Date(event.ts).toISOString().substr(11, 8);

  return (
    <div className="term-line">
      <span className="term-ts">{ts}</span>
      <span className={`term-tag ${tagClass}`}>[{tagText}]</span>
      <span className="term-msg">
        {label}
        {amount ? ` · ${amount}` : ""}
        {counterparty ? ` ${counterparty}` : ""}{" "}
        <a
          href={`https://suiexplorer.com/txblock/${event.txDigest}?network=testnet`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
        >
          {event.txDigest.slice(0, 10)}…
        </a>
      </span>
    </div>
  );
}
