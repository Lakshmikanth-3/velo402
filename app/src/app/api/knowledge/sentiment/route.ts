/**
 * app/api/knowledge/sentiment/route.ts
 *
 * HTTP 402 gated Knowledge Agent endpoint.
 *
 * Flow:
 *   1. First request (no headers) → 402 challenge with request_hash nonce.
 *   2. Agent pays via pay_402_invoice PTB, gets a tx digest.
 *   3. Agent retries with x-velo402-payment-digest + x-velo402-request-hash.
 *   4. This route verifies the AgentActionEvent on-chain (no Supabase
 *      in the security path — the chain is the single source of truth).
 *   5. Returns Walrus blobId + Seal policy package so the agent can
 *      decrypt the dataset with @mysten/seal.
 */
import { NextRequest, NextResponse } from "next/server";
import { suiClient } from "@/lib/sui-client";

const KNOWLEDGE_PRICE_MIST = BigInt(
  process.env.KNOWLEDGE_PRICE_MIST ?? "50000000",
);
const PACKAGE_ID = process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID ?? "";
const SEAL_POLICY_PKG = process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG ?? "";

// In production, blob IDs are registered on-chain or in a simple registry.
// This map will be populated at server startup / by encrypt-and-publish-dataset.ts
const BLOB_REGISTRY: Record<string, string> = {
  '8a94f8b68beb44e0b11ce0d1a55a2562': '0ASL-ixcZvbJWKewRMuyweYEJ_4W5uRbKdz8eSVvIGM',
};

export async function GET(req: NextRequest) {
  const digest = req.headers.get("x-velo402-payment-digest");
  const requestHash = req.headers.get("x-velo402-request-hash");

  // ── Step 1: No payment credentials → issue 402 challenge ─────────────────
  if (!digest || !requestHash) {
    const nonce = crypto.randomUUID().replace(/-/g, "");
    return NextResponse.json(
      {
        error: "Payment Required",
        amount_mist: KNOWLEDGE_PRICE_MIST.toString(),
        recipient: process.env.NEXT_PUBLIC_TREASURY_ID ?? "",
        request_hash: nonce,
        instruction:
          "Call velo402::velo_wallet::pay_402_invoice with this request_hash as " +
          "the nonce, then resubmit with x-velo402-payment-digest header.",
      },
      { status: 402 },
    );
  }

  // ── Step 2: Verify payment on-chain (no Supabase in security path) ────────
  try {
    const tx = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true },
    });

    // action_type is emitted as vector<u8> in Move; the RPC may return it as
    // an array of byte numbers OR as a pre-decoded string depending on SDK version.
    const agentActionEvent = tx.events?.find((e) => {
      if (e.type !== `${PACKAGE_ID}::velo_wallet::AgentActionEvent`)
        return false;
      const raw = (e.parsedJson as any)?.action_type;
      // Decode byte array → string if needed
      const actionStr = Array.isArray(raw)
        ? String.fromCharCode(...raw)
        : String(raw ?? "");
      return actionStr === "402_DATA_PURCHASE";
    });

    if (!agentActionEvent) {
      return NextResponse.json(
        { error: "No matching AgentActionEvent found in transaction." },
        { status: 402 },
      );
    }

    const paid = BigInt((agentActionEvent.parsedJson as any)?.amount ?? 0);
    if (paid < KNOWLEDGE_PRICE_MIST) {
      return NextResponse.json(
        {
          error: `Insufficient payment: expected ${KNOWLEDGE_PRICE_MIST} MIST, got ${paid} MIST.`,
        },
        { status: 402 },
      );
    }

    // ── Step 3: Return Walrus blob reference + Seal policy for decryption ────
    const blobId = BLOB_REGISTRY[requestHash] ?? null;

    return NextResponse.json({
      ok: true,
      digest,
      request_hash: requestHash,
      blob_id: blobId,
      seal_policy_pkg: SEAL_POLICY_PKG,
      message: blobId
        ? "Payment verified. Fetch blob from Walrus and decrypt with Seal."
        : "Payment verified. No blob registered for this request_hash yet — " +
          "run scripts/encrypt-and-publish-dataset.ts to publish data.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "RPC verification failed.", details: msg },
      { status: 500 },
    );
  }
}
