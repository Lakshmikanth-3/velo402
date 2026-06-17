"use client";
import { useEffect, useState } from "react";
import { mistToSui, SCOPE_LABEL, ACTION_LABEL } from "@/lib/velo-constants";

interface TradeEvent {
  id: string;
  txDigest: string;
  action: string;
  amountMist: bigint;
  scopeTag: number;
  ts: number;
}

export default function TradingPage() {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [totalSpot, setTotalSpot] = useState<bigint>(BigInt(0));
  const [totalMargin, setTotalMargin] = useState<bigint>(BigInt(0));
  const [totalPredict, setTotalPredict] = useState<bigint>(BigInt(0));

  useEffect(() => {
    const es = new EventSource("/api/audit/stream");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (
        data.type !== "event" ||
        !data.eventType?.includes("AgentActionEvent")
      )
        return;
      const pj = data.parsedJson as any;
      const scope = Number(pj?.scope_tag ?? 0);
      if (![2, 3, 4].includes(scope)) return;
      const amt = BigInt(pj?.amount ?? 0);
      setTrades((prev) => {
        if (prev.find((t) => t.txDigest === data.txDigest)) return prev;
        return [
          {
            id: data.txDigest,
            txDigest: data.txDigest,
            action: pj?.action_type ?? "",
            amountMist: amt,
            scopeTag: scope,
            ts: Number(data.timestampMs ?? Date.now()),
          },
          ...prev,
        ].slice(0, 100);
      });
      if (scope === 2) setTotalSpot((p) => p + amt);
      if (scope === 3) setTotalMargin((p) => p + amt);
      if (scope === 4) setTotalPredict((p) => p + amt);
    };
    return () => es.close();
  }, []);

  const scopeColor = (s: number) =>
    s === 2 ? "#818cf8" : s === 3 ? "#a78bfa" : "#fb923c";
  const scopeBadge = (s: number) =>
    s === 2 ? "badge-cyan" : s === 3 ? "badge-violet" : "badge-amber";

  return (
    <div className="container">
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1>Trading Desk</h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "0.5rem",
            fontSize: "0.9rem",
          }}
        >
          Read-only view of all DeepBook orders placed by the agent. The agent's
          PolicyCap enforces budget and scope — every entry here is on-chain.
        </p>
      </div>

      {/* Volume summary */}
      <div className="stat-grid fade-up-2" style={{ marginBottom: "1.5rem" }}>
        {[
          {
            label: "Spot Volume",
            value: mistToSui(totalSpot),
            color: "#818cf8",
            scope: "DeepBook Spot",
          },
          {
            label: "Margin Volume",
            value: mistToSui(totalMargin),
            color: "#a78bfa",
            scope: "DeepBook Margin",
          },
          {
            label: "Predict Volume",
            value: mistToSui(totalPredict),
            color: "#fb923c",
            scope: "DeepBook Predict",
          },
          {
            label: "Total Trades",
            value: String(trades.length),
            color: "var(--accent-cyan)",
            scope: "All scopes",
          },
        ].map(({ label, value, color, scope }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value mono" style={{ color }}>
              {value}
              {label !== "Total Trades" ? " SUI" : ""}
            </div>
            <div className="stat-sub">{scope}</div>
          </div>
        ))}
      </div>

      {/* DeepBook info */}
      <div className="card fade-up-2" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem" }}>DeepBook V3 Integration</h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          The agent constructs PTBs using{" "}
          <span className="mono" style={{ color: "var(--accent-cyan)" }}>
            @mysten/deepbook-v3
          </span>{" "}
          SDK. Every trade is gated by the PolicyCap scope check on-chain before
          funds leave the Treasury.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            {
              tag: 2,
              name: "Spot",
              desc: "Standard limit orders on SUI/USDC pool",
            },
            {
              tag: 3,
              name: "Margin",
              desc: "Leveraged positions via DeepBook Margin primitive",
            },
            {
              tag: 4,
              name: "Predict",
              desc: "Binary / range market positions (DeepBook Predict)",
            },
          ].map(({ tag, name, desc }) => (
            <div
              key={tag}
              style={{
                flex: "1 1 200px",
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "0.9rem",
              }}
            >
              <div
                className="mono"
                style={{
                  color: scopeColor(tag),
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                }}
              >
                {name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade history */}
      <div className="card fade-up-3">
        <h3 style={{ marginBottom: "1rem" }}>
          Live Order Log
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              fontWeight: 400,
              marginLeft: "0.5rem",
            }}
          >
            from AgentActionEvent stream
          </span>
        </h3>
        {trades.length === 0 ? (
          <div
            className="terminal"
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "2rem",
            }}
          >
            Waiting for agent to place orders…
            <br />
            <span style={{ fontSize: "0.72rem" }}>
              Agent emits AgentActionEvent on every DeepBook trade.
            </span>
          </div>
        ) : (
          <div className="terminal">
            {trades.map((t) => (
              <div key={t.id} className="term-line">
                <span className="term-ts">
                  {new Date(t.ts).toISOString().substr(11, 8)}
                </span>
                <span
                  className={`badge ${scopeBadge(t.scopeTag)}`}
                  style={{ fontSize: "0.68rem" }}
                >
                  {SCOPE_LABEL[t.scopeTag] ?? `Scope ${t.scopeTag}`}
                </span>
                <span className="term-msg">
                  {ACTION_LABEL[t.action] ?? t.action} ·{" "}
                  {mistToSui(t.amountMist)} SUI{" "}
                  <a
                    href={`https://suiexplorer.com/txblock/${t.txDigest}?network=testnet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                  >
                    {t.txDigest.slice(0, 10)}…
                  </a>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
