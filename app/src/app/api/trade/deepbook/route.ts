/**
 * app/api/trade/deepbook/route.ts
 *
 * Executes a DeepBook trade on behalf of the agent (Spot / Margin / Predict).
 * Signs with the agent's keypair from AGENT_PRIVATE_KEY env var.
 *
 * POST body:
 *   { action: 'BUY'|'SELL', amountMist: number, scopeTag: 2|3|4,
 *     confirmationToken?: string }
 *
 * Returns: { ok, digest, effects }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  buildDeepbookSpotTx,
  buildDeepbookAdvancedTx,
} from "@/lib/ptb-builders";
import { suiClient } from "@/lib/sui-client";
import { getAgentKeypair } from "@/lib/agent-keypair";
import { SCOPE } from "@/lib/velo-constants";

const DEEPBOOK_POOL = process.env.NEXT_PUBLIC_DEEPBOOK_POOL_ID ?? "0x0";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "BUY" | "SELL";
      amountMist: number;
      scopeTag: 2 | 3 | 4;
      confirmationToken?: string;
      skipGuardian?: boolean;
    };

    const { action, amountMist, scopeTag, skipGuardian } = body;

    if (!amountMist || amountMist <= 0) {
      return NextResponse.json(
        { error: "amountMist must be positive." },
        { status: 400 },
      );
    }
    if (
      ![
        SCOPE.DEEPBOOK_SPOT,
        SCOPE.DEEPBOOK_MARGIN,
        SCOPE.DEEPBOOK_PREDICT,
      ].includes(scopeTag)
    ) {
      return NextResponse.json(
        { error: "scopeTag must be 2 (spot), 3 (margin), or 4 (predict)." },
        { status: 400 },
      );
    }

    // ── Guardian pre-flight (unless explicitly skipped by agent runner) ───────
    if (!skipGuardian) {
      const guardianRes = await fetch(
        `${req.nextUrl.origin}/api/guardian/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            amountMist,
            scopeTag,
            intentKey: `${action}:${scopeTag}:${amountMist}`,
          }),
        },
      );
      const guardian = await guardianRes.json();

      if (guardian.blocks?.length) {
        return NextResponse.json(
          {
            ok: false,
            blocked: true,
            risk_level: guardian.risk_level,
            blocks: guardian.blocks,
            human_summary: guardian.human_summary,
          },
          { status: 403 },
        );
      }
    }

    // ── Build PTB ─────────────────────────────────────────────────────────────
    const keypair = getAgentKeypair();
    let tx;

    if (scopeTag === SCOPE.DEEPBOOK_SPOT) {
      tx = buildDeepbookSpotTx({
        amountMist: BigInt(amountMist),
        deepbookBalanceManager: DEEPBOOK_POOL,
      });
    } else {
      tx = buildDeepbookAdvancedTx({
        amountMist: BigInt(amountMist),
        scopeTag,
        deepbookBalanceManager: DEEPBOOK_POOL,
      });
    }

    // ── Sign & submit ─────────────────────────────────────────────────────────
    const result = await suiClient.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true, showEvents: true },
    });

    if (result.effects?.status?.status !== "success") {
      return NextResponse.json(
        {
          ok: false,
          digest: result.digest,
          error: "Transaction failed on-chain.",
          effects: result.effects,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      digest: result.digest,
      action,
      amount_mist: amountMist,
      scope_tag: scopeTag,
      events: result.events ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
