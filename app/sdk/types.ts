export interface Velo402Config {
  network?: 'mainnet' | 'testnet';
  suiClientUrl?: string;
  packageId: string;
  treasuryId: string;
  policyCapId: string;
  paymentRegistryId: string;
  sealPolicyPkgId: string;
  expectedPcr0Hex?: string;
  deepbookSpotPool?: string;
  deepbookMarginPool?: string;
  deepbookPredictPool?: string;
}

export interface PaymentChallenge {
  amount_mist: bigint;
  request_hash: string;
  recipient: string;
  instruction?: string;
}

export interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  amountMist: bigint;
  orderType: 'spot' | 'margin' | 'predict';
}

export interface SentimentData {
  asset: string;
  score: number;
  source: string;
  ts: number;
}
