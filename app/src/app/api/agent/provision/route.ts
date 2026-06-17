/**
 * app/api/agent/provision/route.ts
 *
 * Returns an unsigned, serialized PTB for minting a PolicyCap.
 * The frontend passes this to the human's connected wallet for signing.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildMintPolicyTx } from "@/lib/ptb-builders";
import { suiClient } from "@/lib/sui-client";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      ownerCapId: string;
      maxSpendSui: number;
      expirationEpoch: number;
      allowedScopes: number[];
      attestedComputeRequired: boolean;
      agentAddress: string;
    };

    const {
      ownerCapId,
      maxSpendSui,
      expirationEpoch,
      allowedScopes,
      attestedComputeRequired,
      agentAddress,
    } = body;

    if (!ownerCapId || !agentAddress) {
      return NextResponse.json(
        { error: "ownerCapId and agentAddress are required." },
        { status: 400 },
      );
    }

    const maxSpendMist = BigInt(Math.round(maxSpendSui * 1e9));

    const tx = buildMintPolicyTx({
      ownerCapId,
      maxSpendMist,
      expirationEpoch,
      allowedScopes,
      attestedComputeRequired,
      agentAddress,
    });

    // Serialize the transaction bytes for the wallet to sign
    const txBytes = await tx.build({ client: suiClient });
    const txBase64 = Buffer.from(txBytes).toString("base64");

    return NextResponse.json({
      ok: true,
      txBytes: txBase64,
      summary: {
        maxSpendSui,
        maxSpendMist: maxSpendMist.toString(),
        expirationEpoch,
        allowedScopes,
        attestedComputeRequired,
        agentAddress,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
