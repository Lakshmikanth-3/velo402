"use client";
import { useEffect, useState } from "react";
import { mistToSui } from "@/lib/velo-constants";

const PRICE_MIST = BigInt(
  process.env.NEXT_PUBLIC_KNOWLEDGE_PRICE_MIST ?? "50000000",
);

interface Purchase {
  id: string;
  txDigest: string;
  amountMist: bigint;
  ts: number;
}

export default function MarketplacePage() {
  const [challenge, setChallenge] = useState<Record<string, unknown> | null>(
    null,
  );
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/audit/stream");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (
        data.type === "event" &&
        data.eventType?.includes("AgentActionEvent")
      ) {
        const pj = data.parsedJson as any;
        if (pj?.action_type === "402_DATA_PURCHASE") {
          setPurchases((prev) => {
            if (prev.find((p) => p.txDigest === data.txDigest)) return prev;
            return [
              {
                id: data.txDigest,
                txDigest: data.txDigest,
                amountMist: BigInt(pj.amount ?? 0),
                ts: Number(data.timestampMs ?? Date.now()),
              },
              ...prev,
            ].slice(0, 50);
          });
        }
      }
    };
    return () => es.close();
  }, []);

  const testEndpoint = async () => {
    setTesting(true);
    setChallenge(null);
    try {
      const res = await fetch("/api/knowledge/sentiment");
      const data = await res.json();
      setChallenge({ status: res.status, ...data });
    } catch (e) {
      setChallenge({ error: String(e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container">
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1>Knowledge Marketplace</h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "0.5rem",
            fontSize: "0.9rem",
          }}
        >
          Every dataset is encrypted on <strong>Walrus</strong> and access-gated
          by <strong>Seal</strong>. The agent pays 402 invoices autonomously —
          no human in the data-purchase loop.
        </p>
      </div>

      {/* Endpoint card */}
      <div
        className="card glow-cyan fade-up-2"
        style={{ marginBottom: "1.5rem" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span className="badge badge-cyan">402 Gated</span>
              <span className="badge badge-emerald">Seal Encrypted</span>
              <span className="badge badge-violet">Walrus Stored</span>
            </div>
            <h3 style={{ marginBottom: "0.25rem" }}>
              GET /api/knowledge/sentiment
            </h3>
            <div
              className="mono"
              style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}
            >
              SUI/USDC market sentiment · {mistToSui(PRICE_MIST)} SUI per
              request
            </div>
          </div>
          <button
            id="testEndpointBtn"
            className="btn btn-ghost"
            onClick={testEndpoint}
            disabled={testing}
          >
            {testing ? "Testing…" : "▶ Test Endpoint"}
          </button>
        </div>
        {challenge && (
          <div
            style={{
              marginTop: "1rem",
              background: "var(--bg-deep)",
              borderRadius: "8px",
              padding: "0.9rem",
            }}
          >
            <div
              style={{
                color:
                  (challenge.status as number) === 402
                    ? "var(--accent-amber)"
                    : "var(--accent-emerald)",
                fontWeight: 600,
                marginBottom: "0.4rem",
                fontSize: "0.83rem",
              }}
            >
              HTTP {challenge.status as number}{" "}
              {(challenge.status as number) === 402
                ? "— 402 Challenge ✓"
                : "— Payment Verified ✓"}
            </div>
            <pre
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(challenge, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card fade-up-2" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Seal + Walrus Access Flow</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {[
            [
              "Encrypt",
              "Dataset encrypted with Seal threshold IBE — identity = request_hash. Blob stored on Walrus.",
            ],
            [
              "Pay",
              "Agent pays the 402 invoice via pay_402_invoice PTB. AgentActionEvent emitted on-chain.",
            ],
            [
              "Approve",
              "Seal key servers dry-run seal_approve, verify the on-chain payment, co-sign key share.",
            ],
            [
              "Decrypt",
              "Agent reconstructs key from 2-of-N shares, decrypts blob. No centralized gate-keeper.",
            ],
          ].map(([t, d]) => (
            <div key={t} style={{ display: "flex", gap: "0.75rem" }}>
              <span
                className="badge badge-cyan"
                style={{ flexShrink: 0, alignSelf: "flex-start" }}
              >
                {t}
              </span>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
      <div className="card fade-up-3">
        <h3 style={{ marginBottom: "1rem" }}>
          Purchase History
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              fontWeight: 400,
              marginLeft: "0.5rem",
            }}
          >
            live from AgentActionEvent stream
          </span>
        </h3>
        {purchases.length === 0 ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              textAlign: "center",
              padding: "1.5rem",
            }}
          >
            No purchases recorded yet. Agent emits an event on every paid
            request.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            {purchases.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--accent-cyan)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {p.txDigest.slice(0, 24)}…
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(p.ts).toLocaleTimeString()} ·{" "}
                    {mistToSui(p.amountMist)} SUI
                  </div>
                </div>
                <a
                  href={`https://suiexplorer.com/txblock/${p.txDigest}?network=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem" }}
                >
                  Explorer ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
