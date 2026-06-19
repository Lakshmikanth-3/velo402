/**
 * agent/agent-runner.ts
 *
 * Autonomous agent main loop.  Runs as a standalone Node process.
 * Reads its configuration from environment variables and executes
 * the full Velo402 loop via the Velo402Client SDK.
 */
import { Velo402Client, SentimentData, TradeDecision } from '../sdk';

// ─── Config ──────────────────────────────────────────────────────────────────
const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') ?? 'testnet';
const KNOWLEDGE_API = process.env.KNOWLEDGE_API_URL ?? 'http://localhost:3000/api/knowledge/sentiment';

const config = {
  network: NETWORK,
  packageId: process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!,
  treasuryId: process.env.NEXT_PUBLIC_TREASURY_ID!,
  policyCapId: process.env.NEXT_PUBLIC_POLICY_CAP_ID!,
  paymentRegistryId: process.env.NEXT_PUBLIC_PAYMENT_REGISTRY_ID!,
  sealPolicyPkgId: process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!,
  expectedPcr0Hex: process.env.EXPECTED_PCR0,
  deepbookSpotPool: process.env.NEXT_PUBLIC_DEEPBOOK_SPOT_POOL_ID ?? '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5',
  deepbookMarginPool: process.env.NEXT_PUBLIC_DEEPBOOK_MARGIN_POOL_ID ?? '0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f',
  deepbookPredictPool: process.env.NEXT_PUBLIC_DEEPBOOK_PREDICT_POOL_ID ?? '0x8c1c1b186c4fddab1ebd53e0895a36c1d1b3b9a77cd34e607bef49a38af0150a',
};

// ─── Clients ─────────────────────────────────────────────────────────────────
const client = new Velo402Client(config, process.env.AGENT_PRIVATE_KEY!);

// ─── Main loop ────────────────────────────────────────────────────────────────
async function runAgentLoop() {
  log('Velo402 Agent started.');
  log(`Address : ${client.keypair.toSuiAddress()}`);
  log(`Network : ${NETWORK}`);
  log(`Package : ${config.packageId}`);

  // Run one cycle
  await agentCycle();
  log(`[AGENT] Cycle completed. Exiting.`);
  process.exit(0);
}

async function agentCycle() {
  log('─── New agent cycle ───────────────────────────────');

  // Step 1 & 2 & 3 — hit the knowledge endpoint, pay 402 autonomously, and retry
  log(`[AGENT] Executing 402 loop via SDK...`);
  let dataResult;
  try {
    dataResult = await client.fetch402WithPayment(KNOWLEDGE_API);
  } catch (err) {
    log(`[AGENT] 402 flow failed: ${err}`);
    return;
  }

  if (!dataResult?.blob_id) {
    log('[AGENT] No blob_id returned. Skipping decode step.');
    return;
  }
  log(`[AGENT] Payment accepted. Blob ID: ${dataResult.blob_id}`);

  // Step 4 — fetch + decrypt via Walrus + Seal
  log(`[AGENT] Decrypting Walrus blob via Seal...`);
  let sentiment: SentimentData;
  try {
    sentiment = await client.decryptSealBlob(dataResult.blob_id, dataResult.request_hash);
    log(`[AGENT] Decrypted sentiment: ${JSON.stringify(sentiment)}`);
  } catch (err) {
    log(`[AGENT] Walrus/Seal decrypt failed: ${err}`);
    return;
  }

  // Step 5 — decide
  const decision = decide(sentiment);
  log(`[AGENT] Decision: ${decision.action} (confidence ${decision.confidence.toFixed(2)})`);

  if (decision.action === 'HOLD') {
    log('[AGENT] Holding. No trade this cycle.');
    return;
  }

  // Step 6 — trade
  log(`[AGENT] Executing ${decision.orderType.toUpperCase()} order for ${decision.amountMist} MIST…`);
  try {
    const digest = await client.executeDeepbookTrade(decision);
    log(`[AGENT TRADE SUCCESS] Digest: ${digest}`);
  } catch (err) {
    log(`[AGENT TRADE ERROR] ${err}`);
  }
}

// ─── Step 5 ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────
runAgentLoop().catch((err) => {
  console.error('Fatal agent error:', err);
  process.exit(1);
});
