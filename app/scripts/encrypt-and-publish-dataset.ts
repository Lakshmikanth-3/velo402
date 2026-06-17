/**
 * scripts/encrypt-and-publish-dataset.ts
 *
 * One-time script run by the Knowledge Agent operator to:
 *   1. Compose a sentiment dataset JSON blob.
 *   2. Encrypt it with Seal (threshold IBE) bound to a specific request_hash identity.
 *   3. Publish the encrypted blob to Walrus with guaranteed availability.
 *   4. Print the blobId to be registered in the knowledge API's BLOB_REGISTRY.
 *
 * Run: npx tsx scripts/encrypt-and-publish-dataset.ts
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { WalrusClient } from "@mysten/walrus";
import { SealClient, SessionKey } from "@mysten/seal";

const NETWORK =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") ?? "testnet";
const SEAL_POLICY_PKG = process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!;

// The request_hash this blob will be sold for.
// In production this is generated dynamically per-sale.
// For bootstrapping the demo, set a fixed UUID here.
const REQUEST_HASH =
  process.env.DEMO_REQUEST_HASH ?? crypto.randomUUID().replace(/-/g, "");

async function main() {
  console.log("=== Velo402 Dataset Encrypt + Publish ===");
  console.log(`Network      : ${NETWORK}`);
  console.log(`Request hash : ${REQUEST_HASH}`);
  console.log(`Seal pkg     : ${SEAL_POLICY_PKG}`);

  const suiClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(NETWORK),
    network: NETWORK,
  });

  const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_PRIVATE_KEY!);
  const operatorKeypair = Ed25519Keypair.fromSecretKey(secretKey);

  const walrusClient = new WalrusClient({ 
    network: NETWORK, 
    suiClient,
    publisherUrl: "https://publisher.walrus-testnet.walrus.space",
    aggregatorUrl: "https://aggregator.walrus-testnet.walrus.space"
  });
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
    verifyKeyServers: false, // For testing, bypass verification if it causes issues.
  });

  // ─── 1. Compose dataset ────────────────────────────────────────────────────
  const dataset = {
    asset: "SUI/USDC",
    score: 0.72, // bullish
    source: "velo402-oracle-v1",
    ts: Date.now(),
    note: "Encrypted via Seal, stored on Walrus, sold via HTTP 402.",
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(dataset));
  console.log(`\nDataset (${plaintext.length} bytes):`, dataset);

  // ─── 2. Encrypt with Seal ──────────────────────────────────────────────────
  console.log("\nEncrypting with Seal…");
  const sessionKey = await SessionKey.create({
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

  // ─── 3. Publish to Walrus ─────────────────────────────────────────────────
  console.log("\nPublishing to Walrus…");
  const { blobId } = await walrusClient.writeBlob({
    blob: serialized,
    deletable: true,
    epochs: 12,
    signer: operatorKeypair,
  });

  console.log(`\n✅  Published successfully!`);
  console.log(`    blobId       : ${blobId}`);
  console.log(`    request_hash : ${REQUEST_HASH}`);
  console.log(
    "\nAdd this to BLOB_REGISTRY in app/api/knowledge/sentiment/route.ts:",
  );
  console.log(`  '${REQUEST_HASH}': '${blobId}',`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
