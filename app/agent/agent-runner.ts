/**
 * agent/agent-runner.ts
 *
 * Autonomous agent main loop.  Runs as a standalone Node process.
 * Reads its configuration from environment variables and executes
 * the full Velo402 loop:
 *   1. Poll the sentiment endpoint → receive 402 challenge
 *   2. Build + sign pay_402_invoice PTB autonomously
 *   3. Retry sentiment endpoint with payment digest
 *   4. Decrypt dataset via Seal + Walrus
 *   5. Decide (BUY / SELL / HOLD) based on sentiment
 *   6. Execute DeepBook trade (Spot / Margin / Predict)
 *
 * No human signature is required at any step after initial provisioning.
 */
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { WalrusClient } from '@mysten/walrus';
import { SealClient, SessionKey } from '@mysten/seal';
import { DeepBookClient } from '@mysten/deepbook-v3';
import { buildPay402Tx, buildDeepbookSpotTx, buildDeepbookAdvancedTx } from '../src/lib/ptb-builders';


// ─── Config ──────────────────────────────────────────────────────────────────
const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') ?? 'testnet';
const KNOWLEDGE_API = process.env.KNOWLEDGE_API_URL ?? 'http://localhost:3000/api/knowledge/sentiment';
const PACKAGE_ID    = process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!;
const TREASURY_ID   = process.env.NEXT_PUBLIC_TREASURY_ID!;
const POLICY_CAP_ID = process.env.NEXT_PUBLIC_POLICY_CAP_ID!;
const DEEPBOOK_SPOT_POOL  = process.env.NEXT_PUBLIC_DEEPBOOK_SPOT_POOL_ID   ?? '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5';
const DEEPBOOK_MARGIN_POOL = process.env.NEXT_PUBLIC_DEEPBOOK_MARGIN_POOL_ID ?? '0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f';
const DEEPBOOK_PREDICT_POOL = process.env.NEXT_PUBLIC_DEEPBOOK_PREDICT_POOL_ID ?? '0x8c1c1b186c4fddab1ebd53e0895a36c1d1b3b9a77cd34e607bef49a38af0150a';

const POLL_INTERVAL_MS = 15_000; // 15 s between agent cycles

// ─── Clients ─────────────────────────────────────────────────────────────────
const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(NETWORK), network: NETWORK });

const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_PRIVATE_KEY!);
const agentKeypair = Ed25519Keypair.fromSecretKey(secretKey);

const walrusClient = new WalrusClient({
  network: NETWORK,
  suiClient,
});

const sealClient = new SealClient({
  suiClient,
  serverConfigs: [
    {
      objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
      weight: 1,
    },
    {
      objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
      weight: 1,
    },
  ],
  verifyKeyServers: true, // testnet
});

const deepbookClient = new DeepBookClient({
  client: suiClient,
  address: agentKeypair.toSuiAddress(),
  network: NETWORK,
});

// ─── Main loop ────────────────────────────────────────────────────────────────
async function runAgentLoop() {
  log('Velo402 Agent started.');
  log(`Address : ${agentKeypair.toSuiAddress()}`);
  log(`Network : ${NETWORK}`);
  log(`Package : ${PACKAGE_ID}`);

  // Run one cycle
  await agentCycle();
  log(`[AGENT] Cycle completed. Exiting.`);
  process.exit(0);
}

async function agentCycle() {
  log('─── New agent cycle ───────────────────────────────');

  // Step 1 — hit the knowledge endpoint (expect 402)
  const challenge = await fetch402Challenge();
  if (!challenge) return;

  // Step 2 — pay the invoice autonomously
  const digest = await pay402Invoice(challenge.amount_mist, challenge.request_hash);
  if (!digest) return;

  // Step 3 — retry with payment proof
  const dataResult = await fetchWithPaymentProof(digest, challenge.request_hash);
  if (!dataResult?.blob_id) {
    log('[AGENT] No blob_id returned. Skipping decode step.');
    return;
  }

  // Step 4 — fetch + decrypt via Walrus + Seal
  const sentiment = await decryptSentimentBlob(dataResult.blob_id, challenge.request_hash);
  if (!sentiment) return;

  // Step 5 — decide
  const decision = decide(sentiment);
  log(`[AGENT] Decision: ${decision.action} (confidence ${decision.confidence.toFixed(2)})`);

  if (decision.action === 'HOLD') {
    log('[AGENT] Holding. No trade this cycle.');
    return;
  }

  // Step 6 — trade
  await executeTrade(decision);
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────
async function fetch402Challenge(): Promise<{
  amount_mist: bigint;
  request_hash: string;
  recipient: string;
} | null> {
  const resp = await fetch(KNOWLEDGE_API);
  if (resp.status !== 402) {
    log(`[AGENT] Unexpected status ${resp.status} from knowledge API.`);
    return null;
  }
  const body = await resp.json();
  log(`[AGENT] 402 Challenge received. Hash: ${body.request_hash}, Cost: ${body.amount_mist} MIST`);
  return {
    amount_mist:  BigInt(body.amount_mist),
    request_hash: body.request_hash,
    recipient:    body.recipient,
  };
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────
async function pay402Invoice(amountMist: bigint, requestHash: string): Promise<string | null> {
  log(`[AGENT] Building pay_402_invoice PTB for ${amountMist} MIST…`);
  const pcr0Hex = (process.env.EXPECTED_PCR0 ?? '').replace(/"/g, '');
  const pcr0Bytes = pcr0Hex.length >= 96
    ? new Uint8Array(pcr0Hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    : new Uint8Array(48).fill(0); // Zero hash — only valid if attestedComputeRequired=false
  const tx = buildPay402Tx({
    amountMist,
    recipient: TREASURY_ID,
    nonce: requestHash || crypto.randomUUID(),
    nautilusAttestationHash: pcr0Bytes,
  });

  try {
    const result = await suiClient.signAndExecuteTransaction({
      signer: agentKeypair,
      transaction: tx,
      options: { showEffects: true, showEvents: true },
    });

    if (result.effects?.status?.status !== 'success') {
      log(`[AGENT] Transaction failed: ${JSON.stringify(result.effects?.status)}`);
      return null;
    }

    log(`[AGENT SUCCESS] Payment digest: ${result.digest}`);
    return result.digest;
  } catch (err) {
    log(`[AGENT FAILURE] PTB rejected: ${err}`);
    return null;
  }
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────
async function fetchWithPaymentProof(
  digest: string,
  requestHash: string,
): Promise<{ blob_id: string; seal_policy_pkg: string } | null> {
  const resp = await fetch(KNOWLEDGE_API, {
    headers: {
      'x-velo402-payment-digest': digest,
      'x-velo402-request-hash':   requestHash,
    },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    log(`[AGENT] Knowledge API rejected payment: ${JSON.stringify(err)}`);
    return null;
  }

  const body = await resp.json();
  log(`[AGENT] Payment accepted. Blob ID: ${body.blob_id}`);
  return body;
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────
async function decryptSentimentBlob(blobId: string, requestHash: string): Promise<SentimentData | null> {
  try {
    // Fetch raw (encrypted) blob bytes from Walrus
    const encryptedBytes = await walrusClient.readBlob({ blobId });

    // Decrypt via Seal — the key servers will evaluate knowledge_policy::seal_approve
    // by dry-running it; if the on-chain check passes they co-sign the key share.
    const sessionKey = await SessionKey.create({
      address: agentKeypair.toSuiAddress(),
      packageId: process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!,
      ttlMin: 30,
      signer: agentKeypair,
      suiClient,
    });
    
    // Build the PTB that proves we are allowed to decrypt
    const sealTx = new Transaction();
    sealTx.moveCall({
      target: `${process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!}::knowledge_policy::seal_approve`,
      arguments: [
        sealTx.pure.string(requestHash), // id
        sealTx.object(process.env.NEXT_PUBLIC_PAYMENT_REGISTRY_ID!), // registry
      ],
    });
    // Set sender so it can be built
    sealTx.setSender(agentKeypair.toSuiAddress());
    const sealTxBytes = await sealTx.build({ client: suiClient });

    const decryptedBytes = await sealClient.decrypt({
      data: encryptedBytes,
      sessionKey,
      txBytes: sealTxBytes,
    });

    const json = JSON.parse(Buffer.from(decryptedBytes).toString('utf8')) as SentimentData;
    log(`[AGENT] Decrypted sentiment: ${JSON.stringify(json)}`);
    return json;
  } catch (err) {
    log(`[AGENT] Walrus/Seal decrypt failed: ${err}`);
    return null;
  }
}

// ─── Step 5 ──────────────────────────────────────────────────────────────────
interface SentimentData {
  asset: string;
  score: number; // -1 (very bearish) → +1 (very bullish)
  source: string;
  ts: number;
}

interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  amountMist: bigint;
  orderType: 'spot' | 'margin' | 'predict';
}

function decide(s: SentimentData): TradeDecision {
  const abs = Math.abs(s.score);
  const confidence = abs;

  if (s.score > 0.6) {
    return {
      action: 'BUY',
      confidence,
      amountMist: BigInt(100_000_000), // 0.1 SUI
      orderType: confidence > 0.85 ? 'margin' : 'spot',
    };
  } else if (s.score < -0.5) {
    return {
      action: 'SELL',
      confidence,
      amountMist: BigInt(50_000_000), // 0.05 SUI — hedge via Predict
      orderType: 'predict',
    };
  }

  return { action: 'HOLD', confidence, amountMist: BigInt(0), orderType: 'spot' };
}

// ─── Step 6 ──────────────────────────────────────────────────────────────────
async function executeTrade(decision: TradeDecision) {
  log(`[AGENT] Executing ${decision.orderType.toUpperCase()} order for ${decision.amountMist} MIST…`);

  let tx;
  if (decision.orderType === 'spot') {
    tx = buildDeepbookSpotTx({
      amountMist: decision.amountMist,
      deepbookBalanceManager: DEEPBOOK_SPOT_POOL,
    });
  } else if (decision.orderType === 'margin') {
    tx = buildDeepbookAdvancedTx({
      amountMist: decision.amountMist,
      scopeTag: 3,
      deepbookMarginPoolId: DEEPBOOK_MARGIN_POOL,
      deepbookPredictPoolId: DEEPBOOK_PREDICT_POOL,
    });
  } else {
    tx = buildDeepbookAdvancedTx({
      amountMist: decision.amountMist,
      scopeTag: 4,
      deepbookMarginPoolId: DEEPBOOK_MARGIN_POOL,
      deepbookPredictPoolId: DEEPBOOK_PREDICT_POOL,
    });
  }

  try {
    const result = await suiClient.signAndExecuteTransaction({
      signer: agentKeypair,
      transaction: tx,
      options: { showEffects: true, showEvents: true },
    });

    if (result.effects?.status?.status === 'success') {
      log(`[AGENT TRADE SUCCESS] Digest: ${result.digest}`);
    } else {
      log(`[AGENT TRADE FAILED] ${JSON.stringify(result.effects?.status)}`);
    }
  } catch (err) {
    log(`[AGENT TRADE ERROR] ${err}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── Entry point ─────────────────────────────────────────────────────────────
runAgentLoop().catch((err) => {
  console.error('Fatal agent error:', err);
  process.exit(1);
});
