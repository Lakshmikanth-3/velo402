"use client";
/**
 * app/provision/page.tsx — Mandate Builder
 *
 * The human operator uses this page to mint a PolicyCap for the agent.
 * Inputs:  budget slider, expiry date, scope multi-select, Nautilus toggle.
 * Output:  calls /api/agent/provision → returns unsigned PTB bytes → wallet signs.
 *
 * For the hackathon demo the "Sign with Wallet" step uses window prompt to
 * collect the OwnerCap ID and agent address, then displays the PTB bytes
 * for manual submission via `sui client execute-signed-tx`.
 */
import { useState } from "react";
import { SCOPE, SCOPE_LABEL } from "@/lib/velo-constants";
import { mistToSui, suiToMist } from "@/lib/velo-constants";

const SCOPE_LIST = [
  {
    id: SCOPE.DATA_402,
    label: SCOPE_LABEL[SCOPE.DATA_402],
    desc: "Pay HTTP 402 invoices to Knowledge Agents",
  },
  {
    id: SCOPE.DEEPBOOK_SPOT,
    label: SCOPE_LABEL[SCOPE.DEEPBOOK_SPOT],
    desc: "Execute Spot limit orders on DeepBook",
  },
  {
    id: SCOPE.DEEPBOOK_MARGIN,
    label: SCOPE_LABEL[SCOPE.DEEPBOOK_MARGIN],
    desc: "Leveraged Margin orders on DeepBook v3",
  },
  {
    id: SCOPE.DEEPBOOK_PREDICT,
    label: SCOPE_LABEL[SCOPE.DEEPBOOK_PREDICT],
    desc: "Binary / range Predict positions",
  },
];

export default function ProvisionPage() {
  const [budget, setBudget] = useState(1); // SUI
  const [expiryDays, setExpiryDays] = useState(1);
  const [scopes, setScopes] = useState<number[]>([
    SCOPE.DATA_402,
    SCOPE.DEEPBOOK_SPOT,
  ]);
  const [attested, setAttested] = useState(false);
  const [ownerCapId, setOwnerCapId] = useState("");
  const [agentAddr, setAgentAddr] = useState("");
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [result, setResult] = useState<{
    txBytes: string;
    summary: object;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ~1 epoch ≈ 24 hours on Sui testnet
  const expirationEpoch = currentEpoch + expiryDays;

  const toggleScope = (id: number) => {
    setScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleBuild = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/agent/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerCapId,
          maxSpendSui: budget,
          expirationEpoch,
          allowedScopes: scopes,
          attestedComputeRequired: attested,
          agentAddress: agentAddr,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "760px" }}>
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1>Provision Agent</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Mint a{" "}
          <span className="mono" style={{ color: "var(--accent-cyan)" }}>
            PolicyCap
          </span>{" "}
          with a spend ceiling, expiry, and allowed protocol scope. Sign once —
          the agent operates autonomously within these bounds until you revoke.
        </p>
      </div>

      <div
        className="card fade-up-2"
        style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
      >
        {/* Owner Cap ID */}
        <div>
          <label className="label">OwnerCap Object ID</label>
          <input
            id="ownerCapId"
            className="input mono"
            placeholder="0x…"
            value={ownerCapId}
            onChange={(e) => setOwnerCapId(e.target.value)}
          />
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.3rem",
            }}
          >
            Your OwnerCap object minted when the Treasury was created.
          </p>
        </div>

        {/* Agent address */}
        <div>
          <label className="label">Agent Keypair Address</label>
          <input
            id="agentAddress"
            className="input mono"
            placeholder="0x…"
            value={agentAddr}
            onChange={(e) => setAgentAddr(e.target.value)}
          />
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.3rem",
            }}
          >
            The throwaway Ed25519 address the agent controls. Does <em>not</em>{" "}
            hold treasury funds.
          </p>
        </div>

        {/* Budget slider */}
        <div>
          <label className="label">
            Budget Ceiling —{" "}
            <span className="mono" style={{ color: "var(--accent-cyan)" }}>
              {budget} SUI
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
              ({suiToMist(budget).toString()} MIST)
            </span>
          </label>
          <input
            id="budgetSlider"
            type="range"
            min={0.01}
            max={50}
            step={0.01}
            value={budget}
            onChange={(e) => setBudget(parseFloat(e.target.value))}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            <span>0.01 SUI</span>
            <span>50 SUI</span>
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="label">
            Expiry —{" "}
            <span className="mono" style={{ color: "var(--accent-cyan)" }}>
              {expiryDays} day{expiryDays !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
              ≈ epoch {expirationEpoch}
            </span>
          </label>
          <input
            id="expirySlider"
            type="range"
            min={1}
            max={30}
            step={1}
            value={expiryDays}
            onChange={(e) => setExpiryDays(parseInt(e.target.value))}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            <span>1 day</span>
            <span>30 days</span>
          </div>
        </div>

        {/* Current epoch input */}
        <div>
          <label className="label">Current Epoch (from Mission Control)</label>
          <input
            id="currentEpoch"
            className="input mono"
            type="number"
            placeholder="e.g. 420"
            value={currentEpoch || ""}
            onChange={(e) => setCurrentEpoch(parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Scope selector */}
        <div>
          <label className="label">Authorized Protocol Scopes</label>
          <div className="scope-grid">
            {SCOPE_LIST.map((s) => (
              <button
                key={s.id}
                id={`scope-${s.id}`}
                className={`scope-chip ${scopes.includes(s.id) ? `active-${s.id}` : ""}`}
                onClick={() => toggleScope(s.id)}
                title={s.desc}
              >
                {scopes.includes(s.id) ? "✓ " : ""}
                {s.label}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: "0.73rem",
              color: "var(--text-muted)",
              marginTop: "0.4rem",
            }}
          >
            The agent's PolicyCap will be checked against these scopes on every
            transaction. Attempting an out-of-scope call aborts the PTB at the
            Move layer.
          </p>
        </div>

        {/* Nautilus toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label className="label" style={{ marginBottom: 0 }}>
            Require Nautilus Attestation for Trades
          </label>
          <button
            id="attestationToggle"
            onClick={() => setAttested(!attested)}
            style={{
              width: "42px",
              height: "22px",
              borderRadius: "999px",
              background: attested
                ? "var(--accent-emerald)"
                : "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "3px",
                left: attested ? "22px" : "3px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
              }}
            />
          </button>
          {attested && (
            <span className="badge badge-violet">🔒 TEE Required</span>
          )}
        </div>

        <div className="divider" style={{ margin: "0" }} />

        {/* Summary */}
        <div
          style={{
            background: "var(--bg-deep)",
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            padding: "1rem",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <div>mint_policy(</div>
          <div style={{ paddingLeft: "1.5rem" }}>
            <span style={{ color: "var(--accent-cyan)" }}>owner</span>=
            {ownerCapId || "?"},<br />
            <span style={{ color: "var(--accent-cyan)" }}>max_spend</span>=
            {suiToMist(budget).toString()} MIST ({budget} SUI),
            <br />
            <span style={{ color: "var(--accent-cyan)" }}>
              expiration_epoch
            </span>
            ={expirationEpoch},<br />
            <span style={{ color: "var(--accent-cyan)" }}>allowed_scopes</span>
            =[{scopes.join(",")}],
            <br />
            <span style={{ color: "var(--accent-cyan)" }}>
              attested_compute_required
            </span>
            ={String(attested)},<br />
            <span style={{ color: "var(--accent-cyan)" }}>agent_address</span>=
            {agentAddr || "?"}
            <br />
          </div>
          <div>)</div>
        </div>

        {error && (
          <div
            style={{
              color: "var(--accent-kill)",
              fontSize: "0.85rem",
              fontFamily: "monospace",
            }}
          >
            ✗ {error}
          </div>
        )}

        <button
          id="buildPolicyBtn"
          className="btn btn-primary"
          onClick={handleBuild}
          disabled={loading || !ownerCapId || !agentAddr || scopes.length === 0}
          style={{ alignSelf: "flex-start" }}
        >
          {loading ? "Building PTB…" : "⚡ Build & Sign Policy Transaction"}
        </button>

        {result && (
          <div
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: "10px",
              padding: "1rem",
            }}
          >
            <div
              style={{
                color: "var(--accent-emerald)",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              ✓ PTB Built Successfully
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "0.75rem",
              }}
            >
              Submit these bytes via Sui CLI or your wallet adapter:
            </p>
            <pre
              style={{
                fontSize: "0.7rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
                wordBreak: "break-all",
                whiteSpace: "pre-wrap",
                maxHeight: "140px",
                overflow: "auto",
              }}
            >
              sui client execute-signed-tx --tx-bytes{" "}
              {result.txBytes.slice(0, 80)}…
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
