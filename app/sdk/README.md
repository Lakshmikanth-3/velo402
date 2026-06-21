# @velo402/sdk

The Velo402 Agent SDK is a `fetch()`-compatible client that external agent frameworks (like Eliza or AutoGPT) can import to get the full 402 payment cycle, Guardian pre-flight checks, and budget introspection natively.

## Installation

```bash
npm install @velo402/sdk
```

## Usage Example

```typescript
import { Velo402Client } from '@velo402/sdk';

const client = new Velo402Client({
  network: 'testnet',
  packageId: '0x...',
  treasuryId: '0x...',
  policyCapId: '0x...',
  paymentRegistryId: '0x...',
  sealPolicyPkgId: '0x...',
}, process.env.AGENT_PRIVATE_KEY);

// 1. Fully autonomous 402 flow
const data = await client.fetch402WithPayment('https://api.example.com/knowledge');

// 2. Threshold decryption via Walrus & Seal
const sentiment = await client.decryptSealBlob(data.blob_id, data.request_hash);

// 3. Autonomous DeepBook Trade
await client.executeDeepbookTrade({
  action: 'BUY',
  confidence: 0.9,
  amountMist: 100_000_000n,
  orderType: 'margin'
});
```
