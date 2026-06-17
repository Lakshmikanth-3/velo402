/**
 * lib/velo-constants.ts
 * Central place for all Move type tags and scope byte values.
 * Matches the constants defined in velo_wallet.move.
 */

export const SCOPE = {
  DATA_402: 1,
  DEEPBOOK_SPOT: 2,
  DEEPBOOK_MARGIN: 3,
  DEEPBOOK_PREDICT: 4,
} as const;

export type ScopeTag = (typeof SCOPE)[keyof typeof SCOPE];

export const SCOPE_LABEL: Record<number, string> = {
  [SCOPE.DATA_402]: "402 Data",
  [SCOPE.DEEPBOOK_SPOT]: "DeepBook Spot",
  [SCOPE.DEEPBOOK_MARGIN]: "DeepBook Margin",
  [SCOPE.DEEPBOOK_PREDICT]: "DeepBook Predict",
};

export const ACTION_LABEL: Record<string, string> = {
  "402_DATA_PURCHASE": "Paid 402 Data Invoice",
  DEEPBOOK_SPOT_ORDER: "Placed Spot Limit Order",
  DEEPBOOK_MARGIN_ORDER: "Placed Margin Order",
  DEEPBOOK_PREDICT_POSITION: "Minted Predict Position",
  POLICY_MINTED: "Policy Minted",
  POLICY_REVOKED: "Policy Revoked",
};

/** Move event type suffixes emitted by velo_wallet */
export const EVENT_TYPES = {
  AGENT_ACTION: `${process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID}::velo_wallet::AgentActionEvent`,
  POLICY_MINTED: `${process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID}::velo_wallet::PolicyMintedEvent`,
  POLICY_REVOKED: `${process.env.NEXT_PUBLIC_VELO402_PACKAGE_ID}::velo_wallet::PolicyRevokedEvent`,
};

export const MIST_PER_SUI = BigInt(1_000_000_000);

export function mistToSui(mist: bigint | number | string): string {
  const m = BigInt(mist);
  const whole = m / MIST_PER_SUI;
  const frac = m % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

export function suiToMist(sui: number): bigint {
  return BigInt(Math.round(sui * 1e9));
}
