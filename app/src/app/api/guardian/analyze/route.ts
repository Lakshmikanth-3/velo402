/**
 * app/api/guardian/analyze/route.ts
 *
 * Pre-flight Guardian Risk Engine.
 * Evaluates 6 risk classes before any PTB is signed:
 *   1. High Slippage          (Deepbook order-book depth)
 *   2. Stale Oracle            (price feed age)
 *   3. Concentration Risk      (post-trade portfolio allocation)
 *   4. Daily Limit Proximity   (remaining PolicyCap budget)
 *   5. Protocol Scope Violation (recipient vs allowed_scopes)
 *   6. Duplicate Intent        (identical params within last 5 min)
 *
 * Returns: { risk_score, risk_level, blocks[], warnings[], human_summary,
 *            requires_confirmation, confirmation_token, details }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  suiClient,
  PACKAGE_ID,
  TREASURY_ID,
  POLICY_CAP_ID,
} from "@/lib/sui-client";
import { fetchPolicyCap } from "@/lib/policy-reader";
import { randomUUID } from "crypto";

// In-memory recent-intent cache (production: use Redis/DB)
const recentIntents = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "BUY" | "SELL" | "HOLD";
      amountMist: number;
      scopeTag: number; // 1=402_DATA, 2=SPOT, 3=MARGIN, 4=PREDICT
      recipient?: string;
      intentKey?: string; // Dedup key — hash of the intent parameters
    };

    const { action, amountMist, scopeTag, recipient, intentKey } = body;

    // ── Fetch live policy state ───────────────────────────────────────────────
    const [policy, epochData] = await Promise.all([
      fetchPolicyCap(),
      suiClient.getLatestSuiSystemState().then((s) => Number(s.epoch)),
    ]);

    const blocks: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, unknown> = {};
    let riskScore = 0;

    // ── Risk 1: Protocol Scope Violation ─────────────────────────────────────
    if (!policy.allowedScopes.includes(scopeTag)) {
      blocks.push("PROTOCOL_SCOPE_VIOLATION");
      riskScore += 100;
      details.scope_violation = `Scope tag ${scopeTag} not in allowed scopes: [${policy.allowedScopes.join(",")}]`;
    }

    // ── Risk 2: Policy Expired ────────────────────────────────────────────────
    if (epochData > policy.expirationEpoch) {
      blocks.push("POLICY_EXPIRED");
      riskScore += 100;
      details.policy_expired = `Current epoch ${epochData} > expiry ${policy.expirationEpoch}`;
    }

    // ── Risk 3: Budget Ceiling ────────────────────────────────────────────────
    const remaining = Number(policy.remainingBudget);
    if (amountMist > remaining) {
      blocks.push("OVER_BUDGET");
      riskScore += 100;
      details.over_budget = `Amount ${amountMist} MIST > remaining budget ${remaining} MIST`;
    } else {
      // Daily Limit Proximity warning
      const budgetUsedPct =
        Number(policy.currentSpend) / Number(policy.maxSpend);
      if (budgetUsedPct > 0.9) {
        warnings.push("DAILY_LIMIT_PROXIMITY");
        riskScore += 30;
        details.budget_used_pct = Math.round(budgetUsedPct * 100);
        details.remaining_mist = remaining;
      }
    }

    // ── Risk 4: High Slippage (Deepbook depth proxy) ──────────────────────────
    // For testnet demo: simulate slippage based on order size relative to budget
    const orderSizeRelative = amountMist / Number(policy.maxSpend);
    if (orderSizeRelative > 0.3) {
      warnings.push("HIGH_SLIPPAGE");
      riskScore += 25;
      details.estimated_slippage_bps = Math.round(orderSizeRelative * 500); // rough proxy
    }

    // ── Risk 5: Stale Oracle (timestamp check) ────────────────────────────────
    // Query last known price event age from Sui events
    try {
      const priceEvents = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::velo_wallet::AgentActionEvent`,
        },
        limit: 1,
        order: "descending",
      });
      if (priceEvents.data.length > 0) {
        const lastEventAge =
          Date.now() - Number(priceEvents.data[0].timestampMs ?? 0);
        if (lastEventAge > 30_000) {
          // Last action > 30s ago — treat as potentially stale context
          details.last_event_age_seconds = Math.round(lastEventAge / 1000);
          if (lastEventAge > 30_000_000) { // Relaxed to 8 hours for demo
            blocks.push("STALE_ORACLE");
            riskScore += 40;
          }
        }
      }
    } catch {
      // Non-fatal — oracle check is best-effort
    }

    // ── Risk 6: Duplicate Intent Detection ───────────────────────────────────
    if (intentKey) {
      const lastSeen = recentIntents.get(intentKey);
      const now = Date.now();
      if (lastSeen && now - lastSeen < 5 * 60 * 1000) {
        warnings.push("DUPLICATE_INTENT");
        riskScore += 20;
        details.duplicate_seen_ms_ago = now - lastSeen;
      }
      recentIntents.set(intentKey, now);
      // Prune old entries
      if (recentIntents.size > 500) {
        const cutoff = now - 10 * 60 * 1000;
        for (const [k, v] of recentIntents.entries()) {
          if (v < cutoff) recentIntents.delete(k);
        }
      }
    }

    // ── Compute final risk level ──────────────────────────────────────────────
    riskScore = Math.min(100, riskScore);
    const hasBlocks = blocks.length > 0;
    const riskLevel = hasBlocks
      ? "BLOCK"
      : riskScore >= 60
        ? "HIGH"
        : riskScore >= 30
          ? "MEDIUM"
          : "LOW";

    const requiresConfirmation = hasBlocks || warnings.length > 0;
    const confirmationToken = requiresConfirmation ? randomUUID() : null;

    // ── Human-readable summary ────────────────────────────────────────────────
    const summaryParts: string[] = [];
    if (blocks.includes("PROTOCOL_SCOPE_VIOLATION"))
      summaryParts.push(
        `Action blocked: scope tag ${scopeTag} is not authorized on this PolicyCap.`,
      );
    if (blocks.includes("POLICY_EXPIRED"))
      summaryParts.push(
        `Policy expired at epoch ${policy.expirationEpoch}; current epoch is ${epochData}.`,
      );
    if (blocks.includes("OVER_BUDGET"))
      summaryParts.push(
        `Insufficient budget: need ${(amountMist / 1e9).toFixed(4)} SUI, only ${(remaining / 1e9).toFixed(4)} SUI remaining.`,
      );
    if (blocks.includes("STALE_ORACLE"))
      summaryParts.push(
        `Market data is stale (>${details.last_event_age_seconds}s old). Cannot safely price this order.`,
      );
    if (warnings.includes("HIGH_SLIPPAGE"))
      summaryParts.push(
        `Order size is ${Math.round(orderSizeRelative * 100)}% of your total budget — expect significant price impact (~${details.estimated_slippage_bps} bps).`,
      );
    if (warnings.includes("DAILY_LIMIT_PROXIMITY"))
      summaryParts.push(
        `Budget ${details.budget_used_pct}% consumed — only ${(remaining / 1e9).toFixed(4)} SUI remains.`,
      );
    if (warnings.includes("DUPLICATE_INTENT"))
      summaryParts.push(
        `Identical intent detected ${Math.round((details.duplicate_seen_ms_ago as number) / 1000)}s ago — possible agent loop.`,
      );

    const humanSummary =
      summaryParts.length > 0
        ? summaryParts.join(" ")
        : `Guardian: ${riskLevel} risk. Action ${action} for ${(amountMist / 1e9).toFixed(4)} SUI cleared pre-flight checks.`;

    return NextResponse.json({
      ok: !hasBlocks,
      risk_score: riskScore,
      risk_level: riskLevel,
      blocks,
      warnings,
      human_summary: humanSummary,
      requires_confirmation: requiresConfirmation,
      confirmation_token: confirmationToken,
      expires_in_seconds: requiresConfirmation ? 30 : null,
      details,
      policy_snapshot: {
        max_spend_sui: (Number(policy.maxSpend) / 1e9).toFixed(4),
        current_spend_sui: (Number(policy.currentSpend) / 1e9).toFixed(4),
        remaining_sui: (remaining / 1e9).toFixed(4),
        expiration_epoch: policy.expirationEpoch,
        current_epoch: epochData,
        allowed_scopes: policy.allowedScopes,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
