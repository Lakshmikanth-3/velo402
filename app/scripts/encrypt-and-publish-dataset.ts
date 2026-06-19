/**
 * scripts/encrypt-and-publish-dataset.ts
 *
 * One-time script run by the Knowledge Agent operator to:
 *   1. Compose a real-time SUI/USD sentiment dataset using Pyth oracle data.
 *   2. Encrypt it with Seal (threshold IBE) bound to a specific request_hash identity.
 *   3. Publish the encrypted blob to Walrus using the HTTP Publisher API.
 *   4. Print the blobId to be registered in the knowledge API's BLOB_REGISTRY.
 *
 * Run: npx tsx --env-file=.env scripts/encrypt-and-publish-dataset.ts
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SealClient, SessionKey } from "@mysten/seal";

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") ?? "testnet";
const SEAL_POLICY_PKG = process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!;
const WALRUS_PUBLISHER_URL =
  process.env.WALRUS_PUBLISHER_URL ??
  "https://publisher.walrus-testnet.walrus.space";

// The request_hash this blob will be sold for.
const REQUEST_HASH =
  process.env.DEMO_REQUEST_HASH ?? crypto.randomUUID().replace(/-/g, "");

// Pyth price feed ID for SUI/USD
const PYTH_SUI_USD_ID =
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744";

async function fetchRealSuiPrice() {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SUI_USD_ID}`;
  const resp = await fetch(url);
  const data = await resp.json();
  const parsed = data?.parsed?.[0];
  if (!parsed) throw new Error("Pyth oracle returned no data");
  const price = Number(parsed.price.price) * Math.pow(10, parsed.price.expo);
  const conf  = Number(parsed.price.conf)  * Math.pow(10, parsed.price.expo);
  const ema   = Number(parsed.ema_price.price) * Math.pow(10, parsed.ema_price.expo);
  const publishTime = parsed.price.publish_time;
  return { price, conf, ema, publishTime, feedId: PYTH_SUI_USD_ID };
}

async function main() {
  console.log("=== Velo402 Dataset Encrypt + Publish ===");
  console.log(`Network      : ${NETWORK}`);
  console.log(`Request hash : ${REQUEST_HASH}`);
  console.log(`Seal pkg     : ${SEAL_POLICY_PKG}`);

  // ─── 1. Fetch real-time SUI/USD price from Pyth ───────────────────────────
  console.log("\nFetching real-time SUI/USD price from Pyth oracle...");
  const pythData = await fetchRealSuiPrice();
  const ageSeconds = Math.floor(Date.now() / 1000) - pythData.publishTime;
  console.log(`Pyth SUI/USD: $${pythData.price.toFixed(6)} ±${pythData.conf.toFixed(6)} | age: ${ageSeconds}s`);

  // ─── 2. Compose dataset ───────────────────────────────────────────────────
  const dataset = {
    asset: "SUI/USD",
    price_usd: pythData.price,
    conf_usd: pythData.conf,
    ema_price_usd: pythData.ema,
    pyth_feed_id: pythData.feedId,
    publish_time: pythData.publishTime,
    fetched_at: Date.now(),
    sentiment_score: pythData.price > pythData.ema ? 0.72 : 0.38, // bullish if above EMA
    source: "pyth-hermes-v2",
    note: "Real Pyth oracle data. Encrypted via Seal, stored on Walrus, sold via HTTP 402.",
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(dataset));
  console.log(`\nDataset (${plaintext.length} bytes):`, dataset);

  // ─── 3. Set up Sui + Seal clients ────────────────────────────────────────
  const suiClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(NETWORK),
    network: NETWORK,
  });

  const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_PRIVATE_KEY!);
  const operatorKeypair = Ed25519Keypair.fromSecretKey(secretKey);

  const sealClient = new SealClient({
    suiClient,
    serverConfigs: [
      {
        objectId:
          "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
        weight: 1,
      },
      {
        objectId:
          "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
        weight: 1,
      },
    ],
    verifyKeyServers: true,
  });

  // ─── 4. Encrypt with Seal ─────────────────────────────────────────────────
  console.log("\nEncrypting with Seal…");
  const _sessionKey = await SessionKey.create({
    address: operatorKeypair.toSuiAddress(),
    packageId: SEAL_POLICY_PKG,
    ttlMin: 30,
    signer: operatorKeypair,
    suiClient,
  });

  const result = await sealClient.encrypt({
    threshold: 2,
    packageId: SEAL_POLICY_PKG,
    id: REQUEST_HASH,
    data: plaintext,
  });

  const serialized = result.encryptedObject;
  console.log(`Encrypted object size: ${serialized.length} bytes`);

  // ─── 5. Publish to Walrus via HTTP Publisher API ──────────────────────────
  console.log("\nPublishing to Walrus via HTTP Publisher API...");
  const publishResp = await fetch(
    `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=12`,
    {
      method: "PUT",
      body: serialized,
      headers: { "Content-Type": "application/octet-stream" },
    }
  );

  if (!publishResp.ok) {
    const errText = await publishResp.text();
    throw new Error(`Walrus Publisher error ${publishResp.status}: ${errText}`);
  }

  const publishResult = await publishResp.json();
  // Walrus returns either { newlyCreated: { blobObject: { blobId } } } or { alreadyCertified: { blobId } }
  const blobId =
    publishResult?.newlyCreated?.blobObject?.blobId ??
    publishResult?.alreadyCertified?.blobId ??
    publishResult?.blobId;

  if (!blobId) {
    console.error("Unexpected Walrus response:", JSON.stringify(publishResult, null, 2));
    throw new Error("Could not extract blobId from Walrus response");
  }

  console.log(`\n✅  Published successfully!`);
  console.log(`    blobId       : ${blobId}`);
  console.log(`    request_hash : ${REQUEST_HASH}`);
  console.log(`    Verify at    : https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`);
  console.log(
    "\nAdd this to BLOB_REGISTRY in app/api/knowledge/sentiment/route.ts:"
  );
  console.log(`  '${REQUEST_HASH}': '${blobId}',`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
