import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { WalrusClient } from '@mysten/walrus';
import { SealClient, SessionKey } from '@mysten/seal';
import { DeepBookClient } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import {
  Velo402Config,
  PaymentChallenge,
  TradeDecision,
} from './types';
import {
  buildPay402Tx,
  buildDeepbookSpotTx,
  buildDeepbookAdvancedTx,
} from './builders';

export class Velo402Client {
  public config: Velo402Config;
  public suiClient: SuiJsonRpcClient;
  public keypair: Ed25519Keypair;
  public walrusClient: WalrusClient;
  public sealClient: SealClient;
  public deepbookClient: DeepBookClient;

  constructor(config: Velo402Config, privateKeyBase64: string) {
    this.config = config;
    const network = config.network ?? 'testnet';
    const rpcUrl = config.suiClientUrl ?? getJsonRpcFullnodeUrl(network);
    
    this.suiClient = new SuiJsonRpcClient({ url: rpcUrl, network });

    const { secretKey } = decodeSuiPrivateKey(privateKeyBase64);
    this.keypair = Ed25519Keypair.fromSecretKey(secretKey);

    this.walrusClient = new WalrusClient({
      network,
      suiClient: this.suiClient as any,
    });

    this.sealClient = new SealClient({
      suiClient: this.suiClient as any,
      serverConfigs: [
        {
          objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
          weight: 1,
        },
        {
          objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
          weight: 1,
        },
      ],
      verifyKeyServers: true,
    });

    this.deepbookClient = new DeepBookClient({
      client: this.suiClient as any,
      address: this.keypair.toSuiAddress(),
      network,
    });
  }

  async fetch402WithPayment(url: string, headers?: Record<string, string>): Promise<any> {
    const initRes = await fetch(url, { headers });
    if (initRes.status !== 402) {
       if (initRes.ok) return await initRes.json();
       throw new Error(`Unexpected status ${initRes.status}`);
    }

    const challenge = (await initRes.json()) as PaymentChallenge;
    const amountMist = challenge.amount_mist;
    const requestHash = challenge.request_hash;
    
    const pcr0Hex = (this.config.expectedPcr0Hex ?? '').replace(/"/g, '');
    const pcr0Bytes = pcr0Hex.length >= 96
      ? new Uint8Array(pcr0Hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
      : new Uint8Array(48).fill(0);

    const tx = buildPay402Tx({
      packageId: this.config.packageId,
      policyCapId: this.config.policyCapId,
      treasuryId: this.config.treasuryId,
      paymentRegistryId: this.config.paymentRegistryId,
      amountMist: BigInt(amountMist),
      recipient: challenge.recipient || this.config.treasuryId,
      nonce: requestHash,
      nautilusAttestationHash: pcr0Bytes,
    });

    const result = await this.suiClient.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Payment PTB failed: ${JSON.stringify(result.effects?.status)}`);
    }

    for (let i = 0; i < 4; i++) {
       try {
         await this.suiClient.waitForTransaction({
           digest: result.digest,
           timeout: 3000,
         });
         break;
       } catch (err) {
         if (i < 3) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
       }
    }

    const retryRes = await fetch(url, {
      headers: {
        ...headers,
        'x-velo402-payment-digest': result.digest,
        'x-velo402-request-hash': requestHash,
      },
    });

    if (!retryRes.ok) {
      throw new Error(`Knowledge API rejected payment: ${retryRes.statusText}`);
    }

    return await retryRes.json();
  }

  async decryptSealBlob(blobId: string, requestHash: string): Promise<any> {
    const encryptedBytes = await this.walrusClient.readBlob({ blobId });

    const sessionKey = await SessionKey.create({
      address: this.keypair.toSuiAddress(),
      packageId: this.config.sealPolicyPkgId,
      ttlMin: 30,
      signer: this.keypair as any,
      suiClient: this.suiClient as any,
    });

    const sealTx = new Transaction();
    sealTx.moveCall({
      target: `${this.config.sealPolicyPkgId}::knowledge_policy::seal_approve`,
      arguments: [
        sealTx.pure.string(requestHash),
        sealTx.object(this.config.paymentRegistryId),
      ],
    });
    sealTx.setSender(this.keypair.toSuiAddress());
    const sealTxBytes = await sealTx.build({ client: this.suiClient as any });

    const decryptedBytes = await this.sealClient.decrypt({
      data: encryptedBytes,
      sessionKey,
      txBytes: sealTxBytes,
    });

    return JSON.parse(Buffer.from(decryptedBytes).toString('utf8'));
  }

  async executeDeepbookTrade(decision: TradeDecision): Promise<string> {
    let tx;
    if (decision.orderType === 'spot') {
      tx = buildDeepbookSpotTx({
        packageId: this.config.packageId,
        policyCapId: this.config.policyCapId,
        treasuryId: this.config.treasuryId,
        amountMist: decision.amountMist,
        deepbookBalanceManager: this.config.deepbookSpotPool || '',
      });
    } else {
      const scopeTag = decision.orderType === 'margin' ? 3 : 4;
      tx = buildDeepbookAdvancedTx({
        packageId: this.config.packageId,
        policyCapId: this.config.policyCapId,
        treasuryId: this.config.treasuryId,
        amountMist: decision.amountMist,
        scopeTag,
        deepbookMarginPoolId: this.config.deepbookMarginPool || '',
        deepbookPredictPoolId: this.config.deepbookPredictPool || '',
      });
    }

    const result = await this.suiClient.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Trade failed: ${JSON.stringify(result.effects?.status)}`);
    }

    return result.digest;
  }
}
