import { Velo402Client } from '../sdk';

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function verify() {
  console.log('Verifying SDK Extraction...');
  const config = {
    network: 'testnet' as const,
    packageId: process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID!,
    treasuryId: process.env.NEXT_PUBLIC_TREASURY_ID!,
    policyCapId: process.env.NEXT_PUBLIC_POLICY_CAP_ID!,
    paymentRegistryId: process.env.NEXT_PUBLIC_PAYMENT_REGISTRY_ID!,
    sealPolicyPkgId: process.env.NEXT_PUBLIC_VELO402_SEAL_POLICY_PKG!,
    expectedPcr0Hex: process.env.EXPECTED_PCR0,
  };

  try {
    // Dummy key just for testing initialization if env is not loaded
    const dummyKey = Ed25519Keypair.generate().getSecretKey();
    const client = new Velo402Client(config, process.env.AGENT_PRIVATE_KEY || dummyKey);
    console.log(`✅ SDK initialized for ${client.keypair.toSuiAddress()}`);
  } catch(e) {
    console.error(`❌ SDK initialization failed`, e);
    process.exit(1);
  }
}
verify();
