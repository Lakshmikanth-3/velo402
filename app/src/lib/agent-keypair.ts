/**
 * lib/agent-keypair.ts
 * Loads the agent's Ed25519 keypair from an environment variable.
 * This keypair holds only the PolicyCap object — never treasury funds directly.
 * SERVER-SIDE ONLY.
 */
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

let _keypair: Ed25519Keypair | null = null;

export function getAgentKeypair(): Ed25519Keypair {
  if (_keypair) return _keypair;

  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "AGENT_PRIVATE_KEY env var is not set. " +
        "Ensure your .env file contains the suiprivkey... formatted key.",
    );
  }

  const { secretKey } = decodeSuiPrivateKey(key);
  _keypair = Ed25519Keypair.fromSecretKey(secretKey);
  return _keypair;
}

export function getAgentAddress(): string {
  return getAgentKeypair().toSuiAddress();
}
