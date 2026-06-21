import { Transaction } from "@mysten/sui/transactions";

export function buildPay402Tx({
  packageId,
  policyCapId,
  treasuryId,
  paymentRegistryId,
  amountMist,
  recipient,
  nonce,
  nautilusAttestationHash,
}: {
  packageId: string;
  policyCapId: string;
  treasuryId: string;
  paymentRegistryId: string;
  amountMist: bigint;
  recipient: string;
  nonce: string;
  nautilusAttestationHash: Uint8Array;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::velo_wallet::pay_402_invoice`,
    arguments: [
      tx.object(policyCapId),
      tx.object(treasuryId),
      tx.object(paymentRegistryId),
      tx.pure.string(nonce),
      tx.pure.u64(amountMist),
      tx.pure(bcs_encode_u8_vec(Array.from(nautilusAttestationHash))),
      tx.pure.address(recipient),
      tx.object("0x6"), // Sui Clock
    ],
  });

  return tx;
}

export function buildDeepbookSpotTx({
  packageId,
  policyCapId,
  treasuryId,
  amountMist,
  deepbookBalanceManager,
}: {
  packageId: string;
  policyCapId: string;
  treasuryId: string;
  amountMist: bigint;
  deepbookBalanceManager: string;
}): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::velo_wallet::pay_deepbook_spot`,
    arguments: [
      tx.object(policyCapId),
      tx.object(treasuryId),
      tx.pure.u64(amountMist),
      tx.pure.address(deepbookBalanceManager),
    ],
  });

  return tx;
}

export function buildDeepbookAdvancedTx({
  packageId,
  policyCapId,
  treasuryId,
  amountMist,
  scopeTag,
  deepbookMarginPoolId,
  deepbookPredictPoolId,
}: {
  packageId: string;
  policyCapId: string;
  treasuryId: string;
  amountMist: bigint;
  scopeTag: 3 | 4;
  deepbookMarginPoolId: string;
  deepbookPredictPoolId: string;
}): Transaction {
  const tx = new Transaction();

  const poolId = scopeTag === 3 ? deepbookMarginPoolId : deepbookPredictPoolId;

  tx.moveCall({
    target: `${packageId}::velo_wallet::pay_deepbook_advanced`,
    arguments: [
      tx.object(policyCapId),
      tx.object(treasuryId),
      tx.pure.u64(amountMist),
      tx.pure.u8(scopeTag),
      tx.object(poolId),
    ],
  });

  return tx;
}

function bcs_encode_u8_vec(values: number[]): Uint8Array {
  const len = values.length;
  const uleb = encodeUleb128(len);
  const buf = new Uint8Array(uleb.length + len);
  buf.set(uleb, 0);
  buf.set(new Uint8Array(values), uleb.length);
  return buf;
}

function encodeUleb128(value: number): Uint8Array {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return new Uint8Array(bytes);
}
