/**
 * app/api/owner/revoke/route.ts
 *
 * Builds the kill-switch PTB (revoke_policy) for the human's wallet.
 * Returns unsigned serialized bytes — the wallet signs client-side.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildRevokePolicyTx } from "@/lib/ptb-builders";
import { suiClient } from "@/lib/sui-client";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      ownerCapId: string;
      policyCapId: string;
    };

    const { ownerCapId, policyCapId } = body;

    if (!ownerCapId || !policyCapId) {
      return NextResponse.json(
        { error: "ownerCapId and policyCapId are required." },
        { status: 400 },
      );
    }

    const tx = buildRevokePolicyTx({ ownerCapId, policyCapId });
    const txBytes = await tx.build({ client: suiClient });
    const txBase64 = Buffer.from(txBytes).toString("base64");

    return NextResponse.json({
      ok: true,
      txBytes: txBase64,
      warning:
        "This transaction permanently deletes the PolicyCap. The agent will be " +
        "unable to execute any further transactions after finality.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
