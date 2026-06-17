/**
 * lib/policy-reader.ts
 * Reads the live PolicyCap and Treasury objects from Sui RPC.
 * Used by the dashboard to render the mission-control gauges.
 */
import { suiClient, TREASURY_ID, POLICY_CAP_ID } from "./sui-client";

export interface PolicyCapState {
  id: string;
  treasuryId: string;
  maxSpend: bigint;
  currentSpend: bigint;
  remainingBudget: bigint;
  expirationEpoch: number;
  allowedScopes: number[];
  attestedComputeRequired: boolean;
  exists: boolean;
}

export interface TreasuryState {
  id: string;
  balanceMist: bigint;
  label: string;
}

export async function fetchPolicyCap(): Promise<PolicyCapState> {
  if (!POLICY_CAP_ID) {
    return {
      id: "",
      treasuryId: "",
      maxSpend: BigInt(0),
      currentSpend: BigInt(0),
      remainingBudget: BigInt(0),
      expirationEpoch: 0,
      allowedScopes: [],
      attestedComputeRequired: false,
      exists: false,
    };
  }

  try {
    const obj = await suiClient.getObject({
      id: POLICY_CAP_ID,
      options: { showContent: true },
    });

    if (
      obj.error ||
      !obj.data?.content ||
      obj.data.content.dataType !== "moveObject"
    ) {
      return buildEmptyPolicy(POLICY_CAP_ID, false);
    }

    const fields = (obj.data.content as any).fields as Record<string, any>;
    const maxSpend = BigInt(fields.max_spend ?? 0);
    const currentSpend = BigInt(fields.current_spend ?? 0);

    return {
      id: POLICY_CAP_ID,
      treasuryId: fields.treasury_id,
      maxSpend,
      currentSpend,
      remainingBudget:
        maxSpend > currentSpend ? maxSpend - currentSpend : BigInt(0),
      expirationEpoch: Number(fields.expiration_epoch ?? 0),
      allowedScopes: Array.from(fields.allowed_scopes ?? []) as number[],
      attestedComputeRequired: Boolean(fields.attested_compute_required),
      exists: true,
    };
  } catch {
    return buildEmptyPolicy(POLICY_CAP_ID, false);
  }
}

export async function fetchTreasury(): Promise<TreasuryState> {
  if (!TREASURY_ID) {
    return { id: "", balanceMist: BigInt(0), label: "Unset" };
  }

  const obj = await suiClient.getObject({
    id: TREASURY_ID,
    options: { showContent: true },
  });

  if (
    obj.error ||
    !obj.data?.content ||
    obj.data.content.dataType !== "moveObject"
  ) {
    return { id: TREASURY_ID, balanceMist: BigInt(0), label: "Unknown" };
  }

  const fields = (obj.data.content as any).fields as Record<string, any>;
  const rawBalance = fields.balance?.fields?.value ?? fields.balance ?? "0";

  return {
    id: TREASURY_ID,
    balanceMist: BigInt(rawBalance),
    label: fields.label
      ? Buffer.from(fields.label).toString("utf8")
      : "Agent Treasury",
  };
}

function buildEmptyPolicy(id: string, exists: boolean): PolicyCapState {
  return {
    id,
    treasuryId: "",
    maxSpend: BigInt(0),
    currentSpend: BigInt(0),
    remainingBudget: BigInt(0),
    expirationEpoch: 0,
    allowedScopes: [],
    attestedComputeRequired: false,
    exists,
  };
}
