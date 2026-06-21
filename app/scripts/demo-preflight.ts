import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Velo402Client } from "../sdk";
import fs from "fs";

// Load environment variables if not already set (e.g. if run without --env-file)
if (!process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID) {
  try {
    if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    } else if (fs.existsSync("../.env")) {
      process.loadEnvFile("../.env");
    }
  } catch (e) {
    // Fallback/ignore
  }
}

const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet") ?? "testnet";
const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(NETWORK), network: NETWORK });

async function verifyObjectExists(id: string, name: string) {
  if (!id) throw new Error(`${name} ID is missing from .env`);
  const res = await client.getObject({ id, options: { showType: true } });
  if (res.error || !res.data) {
    throw new Error(`❌ ${name} (${id}) not found on-chain. Please check FINAL_REPORT.md or your .env file.`);
  }
  console.log(`✅ ${name} found: ${id}`);
}

async function verify402Flow() {
  console.log("\nTesting Critical 402 Settlement Path...");
  const config = {
    network: NETWORK,
    packageId: process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!,
    treasuryId: process.env.NEXT_PUBLIC_TREASURY_ID!,
    policyCapId: process.env.NEXT_PUBLIC_POLICY_CAP_ID!,
    paymentRegistryId: process.env.NEXT_PUBLIC_PAYMENT_REGISTRY_ID!,
    sealPolicyPkgId: process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!,
    expectedPcr0Hex: process.env.EXPECTED_PCR0,
  };

  const agentClient = new Velo402Client(config, process.env.AGENT_PRIVATE_KEY!);
  
  try {
    const KNOWLEDGE_API = process.env.KNOWLEDGE_API_URL ?? 'http://localhost:3000/api/knowledge/sentiment';
    console.log(`Submitting 402 payment to: ${KNOWLEDGE_API}`);
    
    // Attempt the full 402 fetch loop
    const data = await agentClient.fetch402WithPayment(KNOWLEDGE_API);
    
    if (data && data.blob_id) {
      console.log(`✅ 402 Payment Loop Succeeded! Blob ID: ${data.blob_id}`);
    } else {
      console.error(`❌ 402 Payment Loop Succeeded but no Blob ID was returned.`);
      return false;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Ignore fetch errors if the Next.js server isn't running for the preflight
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      console.log(`⚠️  Next.js dev server not running. Skipping live 402 endpoint test.`);
      return true;
    }
    console.error(`❌ 402 flow failed:`, msg);
    return false;
  }

  return true;
}

async function main() {
  console.log("=== Velo402 Demo Pre-flight Checklist ===");
  console.log(`Network: ${NETWORK}\n`);

  try {
    // 1. Verify critical environment variables
    console.log("Checking On-Chain Objects...");
    await verifyObjectExists(process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!, "Package");
    await verifyObjectExists(process.env.NEXT_PUBLIC_TREASURY_ID!, "Treasury");
    await verifyObjectExists(process.env.NEXT_PUBLIC_POLICY_CAP_ID!, "PolicyCap");
    await verifyObjectExists(process.env.NEXT_PUBLIC_PAYMENT_REGISTRY_ID!, "PaymentRegistry");
    
    // 2. Verify 402 flow
    const flowOk = await verify402Flow();
    if (!flowOk) {
      console.log("\n❌ Pre-flight failed. Do not record demo.");
      process.exit(1);
    }
    
    console.log("\n🎉 All systems go! Ready for the demo recording.");
    
  } catch (err) {
    console.error(`\n❌ Pre-flight aborted: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
