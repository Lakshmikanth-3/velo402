# Velo402
### *The Wallet That Lets AI Agents Spend Without Ever Being Trusted*

> A Sui-native capability wallet, encrypted knowledge marketplace, and autonomous trading engine that lets AI agents pay per request, trade per signal, and prove every action on-chain — built end-to-end on the 2026 Sui Stack: **Payment Kit, Seal, Walrus, Nautilus, and DeepBook Spot / Margin / Predict.**

**Hackathon:** Sui Overflow 2026 (`overflow.sui.io`) · **Submission Track:** The Agentic Web (Core Track) · **Cross-filed bounties:** DeepBook Specialized Track, Walrus Specialized Track
**Repo codename:** `velo402` · **Status:** PRD / Technical Spec v3 — final

---

## 0. Why this document exists

This PRD is the result of directly researching `overflow.sui.io` and the live Sui ecosystem (June 2026) rather than guessing at a generic "AI + blockchain" pitch. Every architectural decision below is traced to either (a) the actual published track rubric, or (b) a Sui Foundation / sponsor technology that is *currently* being pushed hard into the ecosystem, so that judges see their own roadmap reflected back at them. Section 1 shows the receipts.

---

## 1. Hackathon Fit — Verified Against the Live Tracks

Sui Overflow 2026 runs May–August 2026 with $500K+ in prizes across two **Core Tracks** and several **Specialized Tracks**, sponsored by Walrus (headline partner), DeepBook (track sponsor), OpenZeppelin, OtterSec, and Scallop, among others.

|
 Track 
|
 Official description (verbatim from overflow.sui.io) 
|
 Prize pool 
|
 Velo402 fit 
|
|
---
|
---
|
---
|
---
|
|
**
The Agentic Web
**
 (Core, primary submission) 
|
 "Build autonomous AI agents that can act, transact, and coordinate using Sui's object model and composability." 
|
 $30k / $15k / $10k / $7.5k (1st–4th) 
|
 Velo402 
*
is
*
 this sentence: a PolicyCap 
**
object
**
 delegates 
**
autonomous transacting
**
 authority, and the agent 
**
coordinates
**
 across Payment Kit, Seal, Walrus, Nautilus and DeepBook in a single PTB. 
|
|
**
DeepBook
**
 (Specialized, secondary bounty) 
|
 "Build trading or liquidity applications powered by DeepBook's on-chain orderbook." 
|
 $70k pool 
|
 The agent's trading leg places real Spot, Margin, and 
**
Predict
**
 orders — Predict is DeepBook's brand-new third primitive (testnet, May 2026), so this is genuinely novel surface area, not a recycled Spot-only demo. 
|
|
**
Walrus
**
 (Specialized, secondary bounty) 
|
 "Leverage Walrus to build applications that handle large, off-chain, or verifiable data." 
|
 $70k pool 
|
 The Knowledge Agent's datasets live on Walrus, access-gated by Seal — a textbook "large, off-chain, verifiable data" use case the Walrus team explicitly showcases. 
|

**Submission rule:** Sui Overflow only allows one track per submission, so Velo402 submits under **The Agentic Web**, while the README explicitly documents the DeepBook and Walrus integrations so judges from those sponsor tracks can evaluate the project for their bounty pools during cross-track review (this is exactly how previous Overflow winners like Talus Network's Nexus framework get recognized across multiple sponsor pools).

### Why "Agentic Web," not "DeFi & Payments" or "Payments & Wallets"
The other plausible track, DeFi & Payments, rewards *financial primitives*. Velo402 is not a new AMM or a new stablecoin — it is a *control layer that sits on top of* existing primitives (DeepBook, Payment Kit) so that a non-human actor can use them safely. That is unambiguously an Agentic Web submission, and it is also the track the Sui Foundation has invested the most 2026 roadmap energy into (the entire "Verifiable AI Control Plane" blog series, the AP2 collaboration with Google, the Seal + Nautilus + Walrus AI stack push) — so it is also where judging panels are most primed to reward genuine, deep integration rather than a wrapped wallet button.

---

## 2. The Problem: AI Agents Hit a Wall the Moment They Need to Pay

Two industry shifts collided in 2025–2026 and neither has a clean answer yet:

1. **HTTP got its payment status code back.** Coinbase's **x402** protocol revived the dormant HTTP 402 "Payment Required" code so any API can demand a stablecoin micropayment before serving a response — and Sui is one of the chains x402 facilitators officially support today. Google's **AP2** (Agent Payments Protocol) standardizes how an agent *proves* it was authorized to spend, with Mysten Labs as a direct contributor.
2. **Nobody has solved the "approve wall."** Every demo of an autonomous agent eventually hits a human who has to click "Sign" in a wallet popup. Give the agent unrestricted key access instead, and you've built a hot wallet with a non-deterministic decision-maker attached to it — every CISO's nightmare.

Sui's own engineering blog frames the fix as three composable layers — **intent → authorization → execution** — and explicitly names the three building blocks: AP2 for intent/authorization, x402 for the signaling/trigger, and the native **Sui Payment Kit** for settlement. Velo402 is the first concrete, demoable implementation of exactly that three-layer model, extended with a fourth and fifth layer Sui is simultaneously pushing: **Seal** (who may decrypt what) and **Nautilus** (proof that the agent's brain ran unmodified).

---

## 3. Design Research — What We Borrowed From Past Winners

Before designing the UI, we looked at what actually won at Sui Overflow 2025 and what the ecosystem has shipped since:

- **PIVY** (1st place, Payments & Wallets, 2025) won by making a privacy-first payment tool feel like a *consumer* product, not a developer console — clean balance cards, minimal chrome, plain-English transaction descriptions instead of raw object IDs. We mirror that: the dashboard never shows a raw `0x...` digest as the primary label; it always pairs it with a human sentence ("Agent paid 0.05 USDC to Sentiment Oracle").
- **Talus Network's Nexus framework** treats an AI agent as a literal Sui object that owns capabilities and reacts to on-chain events. We adopt the same object-centric mental model for the PolicyCap/Treasury pair instead of treating the agent as an off-chain script that merely *calls* Sui — the agent's authority *is* an object, and the dashboard visualizes that object's state directly (current spend, remaining budget, time-to-expiry) rather than re-deriving it from logs.
- **Beep**, the agentic-wallet framework Sui's own blog highlights as validating this exact model in production, confirms the "scoped mandate replaces shared credential" pattern is the one worth building a UI around — so the provisioning screen is built as a *mandate builder* (budget, scope, expiry, protocol allow-list), not a generic "fund this address" form.
- The **"approve wall" failure mode** is best demoed, not described — so the UI's hero interaction is a literal split-screen: legacy wallet-popup flow on the left (greyed out, frozen) vs. the agent operating freely on the right inside its mandate. Judges remember demos with a visual gag like this far more than a slide of bullet points.

**UX principle that falls out of this research:** the dashboard is built for a *human supervisor*, not the agent. The agent never sees a UI — it only sees JSON over HTTP and Move call results. Every screen exists to answer one of three supervisor questions: *What can my agent currently do? What has it done? How fast can I stop it?*

---

## 4. Product Vision

**Velo402 gives a human operator a single object — a `PolicyCap` — that is the entire attack surface for delegating financial autonomy to an AI agent.** Fund a `Treasury`, mint a `PolicyCap` with a budget ceiling, an expiry epoch, and a protocol allow-list, hand the cap to the agent's throwaway keypair, and walk away. The agent spends that budget two ways:

1. **Buying data it needs to think** — paying per-request HTTP 402 invoices to "Knowledge Agents" for sentiment, pricing, or research data that is itself encrypted on Walrus and unlockable only against a verified payment receipt via Seal.
2. **Acting on what it bought** — placing real Spot, Margin, or Predict orders on DeepBook, all funded out of the same capped Treasury.

Every dollar the agent ever moves is bounded by Move-enforced math (not application logic), every decision the agent makes can optionally be proven to have executed unmodified inside a Nautilus TEE, and every action — payment or trade — emits an on-chain event the dashboard streams live. The human can revoke the agent's entire financial existence in one transaction, at any time, with zero cooperation required from the agent.

### Core objectives
1. **Delegated autonomy** — the agent transacts with no human signature in the loop, end to end.
2. **Deterministic guardrails enforced on-chain** — budget, expiry, and protocol scope are Move invariants, backed by OpenZeppelin's audited Sui math library so a rounding bug can't become a Cetus-style exploit.
3. **Provable revocation** — one `OwnerCap`-gated call burns the `PolicyCap`; the next agent transaction aborts deterministically.
4. **Verifiable cognition (stretch)** — the agent's buy/sell decision can be proven to have run inside an attested Nautilus enclave, so "the agent decided X" is not just a log line, it's a hardware-backed claim Move can check.
5. **Composable, not bespoke** — wherever Sui ships a native standard (Payment Kit for settlement, Seal for access control), Velo402 calls it instead of reinventing it, because that is the strongest signal to judges that this is a real Sui-native build and not a generic Web3 wallet demo.

---

## 5. System Architecture

### 5.1 High-level view

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              HUMAN CONTROL PLANE                                    │
│   Next.js Dashboard  →  Provision Treasury  →  Mint PolicyCap  →  🔴 Kill Switch    │
└───────────────────────────────────┬────────────────────────────────────────────────┘
                                     │ OwnerCap-gated PTBs
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ON-CHAIN TRUST LAYER  (Sui Move)                          │
│  velo_wallet::Treasury / PolicyCap   ⇄   sui::payment_kit (settlement + receipts)  │
│  OpenZeppelin Contracts for Sui: Ownable access control + overflow-safe DeFi math  │
└───────┬───────────────────────────────────┬───────────────────────┬───────────────┘
        │ pay_402_invoice                   │ execute_deepbook_trade │ AgentActionEvent
        ▼                                   ▼                        ▼
┌───────────────────┐           ┌────────────────────────┐   ┌─────────────────────┐
│  KNOWLEDGE AGENT   │           │   DeepBook Spot /       │   │  Live Audit Feed    │
│  (Next.js API)     │           │   Margin / Predict      │   │  (event-sourced     │
│  x402 middleware   │           │   via @mysten/deepbook  │   │  from Sui RPC, no   │
│  Seal-gated read   │           └────────────────────────┘   │  custom backend DB) │
└─────────┬──────────┘                                        └─────────────────────┘
          │ encrypted blob                ┌───────────────────────────────────────┐
          ▼                                │   MACHINE EXECUTION PLANE             │
┌────────────────────┐                     │   Velo402 Agent SDK (TypeScript)      │
│  Walrus (blobs) +   │◄────────────────────│   reads market data → decides →       │
│  Seal (decrypt keys │   seal_approve PTB  │   builds PTB → signs with throwaway   │
│  via on-chain policy)│                    │   keypair → submits                  │
└────────────────────┘                     │   (optionally: decision runs inside   │
                                            │    a Nautilus AWS Nitro Enclave,      │
                                            │    attested on-chain before the PTB   │
                                            │    is allowed to execute)             │
                                            └───────────────────────────────────────┘
```

### 5.2 The five-layer trust stack

Sui's own framing for agentic commerce is *intent → authorization → execution*, with a *receipt* closing the loop. Velo402 implements all five concrete layers that map onto that framing:

|
 Layer 
|
 Standard / sponsor tech 
|
 Velo402 implementation 
|
|
---
|
---
|
---
|
|
**
1. Intent
**
|
 AP2 (Agent Payments Protocol) 
|
 The human signs one mandate at provisioning time: "this agent may spend up to X, on {402-data, DeepBook}, until epoch Y." This is the AP2-style verifiable intent object, expressed as the 
`PolicyCap`
's fields rather than an off-chain JWT, so the intent 
*
is
*
 the authorization — no separate system to keep in sync. 
|
|
**
2. Authorization
**
|
 Sui object model (capabilities) 
|
`PolicyCap`
 is a Move object, not a row in a database. Possessing it 
*
is
*
 the authorization. OpenZeppelin's 
`Ownable`
 pattern gates who can mint/revoke it. 
|
|
**
3. Signal
**
|
 x402 (HTTP 402) 
|
 Knowledge Agent APIs return a standard 402 challenge with a 
`request_hash`
; the agent's SDK treats this exactly like the Coinbase x402 reference flow, just settling on Sui instead of Base. 
|
|
**
4. Execution
**
|
 Sui Payment Kit + DeepBook 
|
 Settlement of the 402 invoice goes through 
`sui::payment_kit::process_registry_payment`
 — native duplicate prevention, native receipts, zero custom replay-protection code. Trades go through the official 
`@mysten/deepbook-v3`
 SDK against Spot, Margin, or Predict pools. 
|
|
**
5. Receipt
**
|
 Move events + Payment Kit 
`PaymentReceipt`
|
 Every payment returns a 
`PaymentReceipt`
 object and every Move call emits an 
`AgentActionEvent`
. The dashboard's audit feed is a pure subscription to these — there is no off-chain ledger that could ever disagree with chain state. 
|

Two more sponsor layers sit underneath the stack and are the part of this PRD we are proudest of, because they are *not* present in the original Velo402 drafts and are exactly the kind of "hard, currently-being-pushed" tech that makes a submission stand out:

- **Data layer — Seal + Walrus.** The Knowledge Agent's sentiment dataset is a blob on Walrus, encrypted client-side with Seal before upload. The on-chain Seal policy (`seal_approve`) only releases a decryption key to a requester whose Sui address shows up in the Payment Kit registry as having paid for that specific `request_hash`. This replaces a Postgres "has this user paid" boolean with a cryptographic, on-chain, threshold-encrypted answer to the same question — which is precisely the gap Seal's own launch materials describe ("today's storage is public by default, encryption is left to app developers, access control is hard-coded or missing entirely").
- **Compute layer — Nautilus (stretch goal, demoed on testnet).** The agent's "should I trust this sentiment data enough to trade on it" decision can optionally run inside an AWS Nitro Enclave registered with Sui's Nautilus framework. The enclave returns a signed attestation alongside its decision; a Move function verifies the attestation before allowing the `execute_deepbook_trade` call to proceed. This turns "trust the agent's reasoning" into "verify the agent's reasoning ran on unmodified, isolated code" — exactly Nautilus's stated AI-agent use case.

### 5.3 Why we deliberately removed Supabase from the trust boundary

The earlier Velo402 drafts used a Supabase table with a unique constraint on transaction digest to stop replay attacks. That works, but it quietly puts a centralized Postgres instance back at the center of a story about decentralized trust — exactly the failure mode Seal's documentation calls out by name. In this version, **idempotency and replay protection are handled entirely on-chain** by `sui::payment_kit`'s `PaymentRegistry` (composite `PaymentKey` of nonce + amount + coin type + receiver, with configurable record expiry). A lightweight cache (Postgres or just an in-memory LRU) is still allowed in the architecture, but only as a **read-through speed optimization for the dashboard's event feed** — if it disappears entirely, the system's security properties are unaffected, because nothing security-critical reads from it. That distinction is exactly what we want a judge scanning the architecture diagram to notice.

---

## 6. On-Chain Smart Contracts (Sui Move)

### 6.1 `velo_wallet.move` — capability-scoped treasury

```move
module velo402::velo_wallet {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    // OpenZeppelin Contracts for Sui — audited overflow-safe math
    // (the same overflow-guard class of bug that caused the Cetus exploit)
    use openzeppelin_math::fixed_point::{UD30x9};
    use openzeppelin_access::ownable::{Self, OwnerRole};

    const ENotOwner: u64 = 0;
    const EExpired: u64 = 1;
    const EOverBudget: u64 = 2;
    const EScopeNotAllowed: u64 = 3;

    /// Human's master capability. Ownership semantics delegated to
    /// OpenZeppelin's Ownable module instead of a hand-rolled check.
    public struct OwnerCap has key, store {
        id: UID,
        treasury_id: ID,
        role: OwnerRole,
    }

    /// The AI agent's restricted, revocable wallet permission.
    public struct PolicyCap has key, store {
        id: UID,
        treasury_id: ID,
        max_spend: u64,              // ceiling in MIST / smallest coin unit
        current_spend: u64,          // running total, checked via OZ mul_div-safe math
        expiration_epoch: u64,
        allowed_scopes: vector<u8>,  // e.g. b"402_DATA" | b"DEEPBOOK_SPOT" | b"DEEPBOOK_MARGIN" | b"DEEPBOOK_PREDICT"
        attested_compute_required: bool, // if true, trades must carry a verified Nautilus attestation
    }

    /// The shared vault holding agent-spendable funds.
    public struct Treasury has key {
        id: UID,
        balance: Coin<SUI>,
    }

    /// Immutable audit trail consumed by the dashboard's live feed.
    public struct AgentActionEvent has copy, drop {
        agent_cap: ID,
        action_type: vector<u8>,
        amount: u64,
        counterparty: address,
        remaining_budget: u64,
    }

    /// Mint a scoped capability for the agent's throwaway keypair.
    public entry fun mint_policy(
        owner: &OwnerCap,
        treasury: &Treasury,
        max_spend: u64,
        expiration_epoch: u64,
        allowed_scopes: vector<u8>,
        attested_compute_required: bool,
        agent_address: address,
        ctx: &mut TxContext
    ) {
        assert!(ownable::is_owner(&owner.role, tx_context::sender(ctx)), ENotOwner);
        let cap = PolicyCap {
            id: object::new(ctx),
            treasury_id: object::id(treasury),
            max_spend,
            current_spend: 0,
            expiration_epoch,
            allowed_scopes,
            attested_compute_required,
        };
        transfer::transfer(cap, agent_address);
    }

    /// Agent pays a 402 invoice. Settlement itself is delegated to
    /// sui::payment_kit so duplicate-prevention and receipts are native,
    /// not re-implemented here.
    public entry fun pay_402_invoice(
        policy: &mut PolicyCap,
        treasury: &mut Treasury,
        registry: &mut sui::payment_kit::PaymentRegistry,
        nonce: std::string::String,
        amount: u64,
        recipient: address,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::epoch(ctx) <= policy.expiration_epoch, EExpired);
        assert!(contains_scope(&policy.allowed_scopes, b"402_DATA"), EScopeNotAllowed);

        // Overflow-safe budget check via OpenZeppelin fixed-point math
        let projected = openzeppelin_math::checked_add(policy.current_spend, amount);
        assert!(projected <= policy.max_spend, EOverBudget);
        policy.current_spend = projected;

        let payment_coin = coin::split(&mut treasury.balance, amount, ctx);
        sui::payment_kit::process_ephemeral_payment<SUI>(
            nonce, amount, payment_coin, recipient, clock, ctx
        );

        event::emit(AgentActionEvent {
            agent_cap: object::id(policy),
            action_type: b"402_DATA_PURCHASE",
            amount,
            counterparty: recipient,
            remaining_budget: policy.max_spend - policy.current_spend,
        });
    }

    /// Human burns the agent's entire financial authority in one call.
    public entry fun revoke_policy(owner: &OwnerCap, policy: PolicyCap, ctx: &mut TxContext) {
        assert!(owner.treasury_id == policy.treasury_id, ENotOwner);
        let PolicyCap { id, treasury_id: _, max_spend: _, current_spend: _,
                         expiration_epoch: _, allowed_scopes: _, attested_compute_required: _ } = policy;
        object::delete(id);
    }

    fun contains_scope(scopes: &vector<u8>, needle: vector<u8>): bool {
        // straightforward membership check against the allow-list
        std::vector::contains(scopes, &needle)
    }
}
```

*Note for implementers:* exact OpenZeppelin Contracts for Sui module paths (`openzeppelin_math`, `openzeppelin_access::ownable`) should be pinned against whatever version of `OpenZeppelin/contracts-sui` is current at build time — the package is moving fast (new modules landed as recently as April–May 2026) — but the *pattern* of delegating ownership checks and fixed-point arithmetic to OZ's audited code instead of hand-rolling it is the architectural commitment this PRD is making.

### 6.2 `execute_deepbook_trade` — the DeepBook leg

```move
public entry fun execute_deepbook_trade(
    policy: &mut PolicyCap,
    treasury: &mut Treasury,
    pool: &mut deepbook::pool::Pool<SUI, USDC>,
    balance_manager: &mut deepbook::balance_manager::BalanceManager,
    scope_tag: vector<u8>,                 // b"DEEPBOOK_SPOT" | "_MARGIN" | "_PREDICT"
    amount: u64,
    attestation: Option<nautilus::Attestation>,
    ctx: &mut TxContext
) {
    assert!(contains_scope(&policy.allowed_scopes, scope_tag), EScopeNotAllowed);
    if (policy.attested_compute_required) {
        assert!(option::is_some(&attestation), EScopeNotAllowed);
        nautilus::verify_attestation(option::borrow(&attestation));
    };
    let projected = openzeppelin_math::checked_add(policy.current_spend, amount);
    assert!(projected <= policy.max_spend, EOverBudget);
    policy.current_spend = projected;
    // ... deposit into balance_manager, call deepbook::pool::place_limit_order or
    // the relevant Margin / Predict entrypoint, mirroring the @mysten/deepbook-v3 SDK call graph
}
```

---

## 7. Off-Chain Layer (Next.js)

### 7.1 Why Next.js, and why this is "microservices, not a monolith"

Velo402 ships as a single Next.js 15 (App Router) repository, but each API route is written as an isolated, independently-deployable handler with its own external dependency — in effect a microservice topology expressed through Next.js's edge/serverless function model rather than a fleet of separate containers. That keeps local dev to `npm run dev` while still letting the x402 settlement service, the Seal gateway, the Walrus storage worker, and the Nautilus attestation relay scale and fail independently in production (each can be deployed as its own Vercel Edge Function / standalone Node Lambda).

### 7.2 API surface

|
 Route 
|
 Sponsor tech invoked 
|
 Responsibility 
|
|
---
|
---
|
---
|
|
`POST /api/agent/provision`
|
 Sui Move (
`mint_policy`
) 
|
 Builds and returns an unsigned PTB for the human to sign, minting a 
`PolicyCap`
. 
|
|
`GET /api/knowledge/sentiment`
|
**
x402
**
 middleware, 
**
Seal
**
, 
**
Walrus
**
|
 Returns 402 on first hit; on a valid retried request with a settled payment digest, fetches the encrypted blob from Walrus, builds the 
`seal_approve`
 PTB, decrypts server-side (or returns the decrypt PTB for client-side decryption), and serves the data. 
|
|
`POST /api/trade/deepbook`
|
**
DeepBook
**
 SDK (
`@mysten/deepbook-v3`
) 
|
 Builds the Spot / Margin / Predict PTB for the agent's signed decision and submits it via 
`execute_deepbook_trade`
. 
|
|
`POST /api/compute/attest`
|
**
Nautilus
**
|
 Proxies a decision-making payload into the AWS Nitro Enclave, returns the signed attestation to be attached to the trade PTB. 
|
|
`GET /api/audit/stream`
|
 Sui events (no custom DB) 
|
 Server-Sent-Events stream subscribing directly to 
`AgentActionEvent`
 and Payment Kit's payment events via Sui's GraphQL/gRPC indexing API. 
|
|
`POST /api/owner/revoke`
|
 Sui Move (
`revoke_policy`
) 
|
 Builds the 
`OwnerCap`
-gated PTB for the kill switch. 
|

### 7.3 The x402 middleware, calling into Sui Payment Kit

```typescript
// app/api/knowledge/sentiment/route.ts
import { SuiGrpcClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: getFullnodeUrl('testnet') });
const PAYMENT_REGISTRY_ID = process.env.VELO402_PAYMENT_REGISTRY!; // sui::payment_kit::PaymentRegistry
const KNOWLEDGE_PRICE_MIST = 50_000_000; // 0.05 SUI-denominated invoice

export async function GET(req: Request) {
  const digest = req.headers.get('x-velo402-payment-digest');
  const requestHash = req.headers.get('x-velo402-request-hash');

  if (!digest || !requestHash) {
    return Response.json(
      {
        error: 'Payment Required',
        amount_mist: KNOWLEDGE_PRICE_MIST,
        request_hash: crypto.randomUUID(),
        instruction:
          'Call velo402::velo_wallet::pay_402_invoice with this nonce as request_hash, ' +
          'then resubmit with x-velo402-payment-digest set to the resulting transaction digest.',
      },
      { status: 402 },
    );
  }

  // Settlement truth lives on-chain in the Payment Kit registry — no Supabase lookup.
  const tx = await client.getTransaction({ digest, options: { showEvents: true } });
  const settled = tx.events?.some(
    (e) => e.type.endsWith('::payment_kit::PaymentEvent') &&
           (e.parsedJson as any)?.nonce === requestHash,
  );
  if (!settled) return Response.json({ error: 'Payment not found in registry' }, { status: 402 });

  // Payment confirmed on-chain → fetch the encrypted blob and let Seal gate the key.
  const blobId = await lookupBlobIdForRequest(requestHash);
  return Response.json({ blobId, sealPolicyPackage: process.env.VELO402_SEAL_POLICY_PKG });
}
```

### 7.4 Seal — encrypting the dataset and writing the on-chain policy

```typescript
// scripts/encrypt-and-publish-dataset.ts
import { SealClient } from '@mysten/seal';

const seal = new SealClient({ network: 'testnet', keyServers: VERIFIED_TESTNET_KEY_SERVERS });

const { encryptedObject } = await seal.encrypt({
  threshold: 2,                     // 2-of-N key servers must cooperate to decrypt
  packageId: VELO402_PACKAGE_ID,     // this package owns the IBE identity namespace
  id: requestHashBytes,              // identity = the specific 402 request_hash being sold
  data: sentimentDatasetBytes,
});
// encryptedObject is then written to Walrus, see 7.5
```

```move
// move/seal_policy/knowledge_policy.move
module velo402::knowledge_policy {
    const ENoAccess: u64 = 1;

    /// Evaluated off-chain by Seal key servers via dry_run_transaction_block.
    /// Approves a decrypt request only if this exact request_hash has a
    /// matching settled PaymentEvent in the Sui Payment Kit registry.
    public fun seal_approve(
        id: vector<u8>,
        registry: &sui::payment_kit::PaymentRegistry,
        clock: &sui::clock::Clock,
    ) {
        assert!(payment_kit_has_settled_nonce(registry, id, clock), ENoAccess);
    }
}
```

### 7.5 Walrus — storing the dataset blob

```typescript
// scripts/encrypt-and-publish-dataset.ts (continued)
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const walrusClient = new WalrusClient({ network: 'testnet', suiClient });

const { blobId, blobObject } = await walrusClient.writeBlob({
  blob: encryptedObject,
  deletable: true,
  epochs: 12,                 // ~12 Walrus epochs of guaranteed availability
  signer: knowledgeAgentKeypair,
});

console.log(`Published encrypted sentiment dataset → blobId ${blobId}, object ${blobObject.id.id}`);
```

### 7.6 Nautilus — verifiable agent cognition (stretch goal)

```move
// move/nautilus_gate/decision_gate.move
module velo402::decision_gate {
    use nautilus::attestation::{Self, Attestation};

    const EBadAttestation: u64 = 1;
    const EXPECTED_PCR0: vector<u8> = x"...reproducible-build-measurement...";

    /// Verifies the AWS Nitro Enclave attestation that committed to a specific
    /// trade decision before that decision is allowed to reach DeepBook.
    public fun verify_attestation(att: &Attestation) {
        assert!(attestation::pcr0(att) == EXPECTED_PCR0, EBadAttestation);
        assert!(attestation::is_signed_by_root_of_trust(att), EBadAttestation);
    }
}
```

```typescript
// agent/nautilus-client.ts — agent SDK asks the enclave to decide, gets a proof back
const decision = await fetch(`${NAUTILUS_ENCLAVE_URL}/process_data`, {
  method: 'POST',
  body: JSON.stringify({ sentimentBlobId, currentPositions }),
}).then((r) => r.json());
// decision.action ∈ {BUY, SELL, HOLD}; decision.attestation is the signed PCR + result,
// attached to the on-chain PTB so Move can verify it before the trade executes.
```

### 7.7 DeepBook — the trading leg (Spot, Margin, *and* Predict)

```typescript
// agent/deepbook-execute.ts
import { Transaction } from '@mysten/sui/transactions';
import { DeepBookMarketMaker } from '@mysten/deepbook-v3';

const mm = new DeepBookMarketMaker(agentPrivateKey, 'testnet', { AGENT: { address: agentBalanceManagerId } });
const tx = new Transaction();

if (decision.action === 'BUY' && decision.confidence > 0.8 && availableMarginRoom) {
  // New: DeepBook Margin — leveraged conviction trade, gated by PolicyCap scope "DEEPBOOK_MARGIN"
  mm.marginPool.supplyToMarginPool('USDC', supplierCap, marginAmount)(tx);
  mm.placeLimitOrderExample(tx); // wraps deepbook::pool::place_limit_order
} else if (decision.action === 'HEDGE') {
  // New: DeepBook Predict — bet directly on a binary/range market instead of spot exposure
  mm.predict.mintPosition('SUI_ABOVE_5_USD_JUL26', predictAmount)(tx);
} else {
  mm.placeLimitOrderExample(tx); // plain Spot order
}

const result = await mm.signAndExecute(tx); // funded only via velo_wallet::execute_deepbook_trade upstream
```

---

## 8. Frontend / UX Specification

### 8.1 Design language
Dark, "mission control" aesthetic, not a generic crypto-wallet light theme — judges have seen a hundred light-mode token-swap UIs this cycle; a control-room feel (think flight-deck telemetry, not DeFi dashboard) signals "this manages risk," which is the actual product. Monospace numerals for all amounts and epochs (clarity over flair where it matters), a single accent color reserved exclusively for the kill switch so it's never visually confused with anything else on the page.

### 8.2 Pages

1. **Provision** — a mandate builder, not a deposit form: budget slider, expiry date picker (converted to epoch under the hood), a multi-select of allowed scopes (`402 Data`, `DeepBook Spot`, `Margin`, `Predict`), and a toggle for "require Nautilus attestation before trading." Submitting renders the exact PTB about to be signed in human language before the wallet popup appears.
2. **Mission Control (home)** — the `PolicyCap` rendered as a live gauge: spent vs. remaining budget, epochs until expiry, current allowed scopes as chips. Directly below it, the **live audit feed** (Section 7.2's SSE stream) renders each `AgentActionEvent` as a single sentence with an expandable raw-event drawer for power users — satisfying both the "PIVY-style plain English" research finding and the "Talus-style raw object state" finding in the same component.
3. **Knowledge Marketplace** — a read-only view of which Knowledge Agents the operator's agent has paid, each row showing the 402 price, the Seal policy package, and a "preview" of the dataset that only renders if the *operator's own* address (not the agent's) can independently satisfy the same `seal_approve` check — letting a human verify what their agent is buying without re-paying.
4. **Trading Desk** — read-only DeepBook position viewer (Spot balance, Margin health ratio, open Predict positions), so a human can audit the financial consequences of the agent's autonomy without granting themselves trading authority over the same `PolicyCap`.
5. **🔴 Kill Switch** — full-bleed red action, two-step confirm (type the agent's nickname to confirm), and a real-time countdown showing the next epoch boundary so the operator understands current exposure even before they click. This is deliberately the most over-built UI element in the whole app, because it is the single feature every demo video and every judge's mental model will anchor on.

### 8.3 Flexibility by design
Every screen reads its data from the `PolicyCap`'s `allowed_scopes` field, not from hardcoded UI logic — adding a sixth spending scope (say, a future Walrus storage-purchase scope, or a Scallop money-market deposit scope) requires zero frontend changes beyond a label lookup table. This is the "very flexible UX" the product needs: the mandate builder and the mission-control gauge are generic renderers over whatever scopes the Move contract currently supports, so the same UI scales from a two-scope hackathon demo to an N-scope production agent platform without a rewrite.

---

## 9. Data Model

### On-chain (source of truth)
- `Treasury` (shared object) — `{ id, balance: Coin<SUI> }`
- `OwnerCap` (owned by human) — `{ id, treasury_id, role }`
- `PolicyCap` (owned by agent keypair) — `{ id, treasury_id, max_spend, current_spend, expiration_epoch, allowed_scopes, attested_compute_required }`
- `sui::payment_kit::PaymentRegistry` / `PaymentReceipt` / `PaymentRecord` (native Sui standard, reused not reimplemented)
- `AgentActionEvent` (Move event, not an object — pure audit stream)

### Off-chain (cache only, disposable)
```sql
-- OPTIONAL speed cache for the dashboard's event feed.
-- Deleting this table changes nothing about system security or correctness.
CREATE TABLE event_cache (
    id BIGSERIAL PRIMARY KEY,
    tx_digest TEXT NOT NULL,
    event_type TEXT NOT NULL,
    parsed_json JSONB NOT NULL,
    observed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_event_cache_tx ON event_cache(tx_digest);
```

---

## 10. Security & Audit Plan

- **Math safety:** all budget arithmetic in `velo_wallet.move` routes through OpenZeppelin Contracts for Sui's audited overflow-safe integer/fixed-point library — the same class of primitive whose absence caused the Cetus exploit that OpenZeppelin's own Sui launch post calls out by name.
- **Access control:** `OwnerCap` permissions are expressed via OpenZeppelin's `Ownable` pattern rather than a bespoke `assert!(sender == owner)`, so ownership-transfer edge cases inherit a battle-tested implementation instead of a hackathon-grade one.
- **Replay protection:** delegated entirely to `sui::payment_kit`'s composite `PaymentKey` registry — no custom nonce table to get wrong.
- **Data confidentiality:** Seal's threshold encryption means no single key server (and no Velo402 server) can unilaterally decrypt a dataset; the **Decentralized Seal Key Server** (MPC committee mode, testnet as of March 2026) is the target configuration for production so trust is spread across independent operators, not concentrated in Velo402's own infrastructure.
- **Compute integrity:** Nautilus attestation verification means a compromised or modified agent binary cannot silently change trading behavior without the on-chain attestation check failing.
- **Bug bounty / external review:** OtterSec, a Sui Overflow prize sponsor and one of the ecosystem's primary Move auditors, is the intended external review partner post-hackathon; the contract is written defensively (explicit error codes, no silent failure paths, capability objects instead of address-based ACLs) specifically to be audit-ready from day one rather than retrofitted.
- **Kill switch latency:** revocation is a single `OwnerCap`-gated transaction with no dependency on the agent's cooperation, network conditions permitting, finality is sub-second under Sui's Mysticeti consensus, so the gap between "click revoke" and "agent provably cannot transact" is bounded by chain finality, not by application polling intervals.

---

## 11. Demo Script (3 minutes, judge-optimized)

1. **The wall (20s).** Show a generic agent framework hit a wallet-extension popup and freeze. Cut to black with "There has to be a better way."
2. **The mandate (30s).** Open Mission Control, hit Provision. Set a $50 USDC-equivalent budget, 24-hour expiry, scopes = `402 Data` + `DeepBook Spot` + `DeepBook Predict`. Sign once. The agent's keypair receives the `PolicyCap` — no further human input from here.
3. **The loop (60s).** Split screen. Left: terminal logs of the agent hitting `/api/knowledge/sentiment`, getting 402'd, building the `pay_402_invoice` PTB, paying, and — live on screen — the Seal-gated dataset unlocking the moment the Payment Kit registry shows the settled nonce. Right: the live audit feed rendering the same event as a human sentence in real time.
4. **The trade (40s).** The agent's decision (optionally Nautilus-attested on screen, attestation badge turning green) triggers a DeepBook Predict position mint. Cut to DeepBook's own testnet UI/explorer showing the position is real, on-chain, third-party-verifiable — not a mocked screenshot.
5. **The failsafe (20s).** Manually force a request 2x over budget. Show the Move abort. No app-layer try/catch saved it — the chain itself said no.
6. **The kill switch (20s).** Click revoke. Immediately replay the agent's next scheduled action. Show it abort with `EExpired`/object-not-found, on-chain, irreversibly, without the agent's code changing at all.
7. **Close (10s).** One line on screen: *"The agent never held a key a human could lose sleep over. Every dollar it ever moved was bounded by math, not promises."*

---

## 12. Roadmap Beyond the Hackathon

- **Decentralized Seal Key Server in production** — move from independent key servers to the MPC committee mode for the live dataset marketplace.
- **Idle-treasury yield via Scallop** — while a `PolicyCap`'s budget sits unspent, sweep idle Treasury balance into a Scallop money-market position (Scallop is a Sui Overflow University Award sponsor and one of the ecosystem's flagship lending protocols), auto-unwound the instant a payment or trade needs liquidity.
- **Multi-agent swarms** — one `Treasury`, many scoped `PolicyCap`s, so a human can run a fleet of specialized agents (one buys data, one trades Spot, one hedges via Predict) all metered against one shared, revocable budget.
- **Full AP2 mandate objects** — today the `PolicyCap`'s fields *are* the mandate; the next iteration emits a formal AP2-schema mandate object alongside it so Velo402 interoperates with non-Sui AP2-compliant agent frameworks out of the box.
- **DeepBook Margin referral integration** — DeepBook v3's new referral/commission model (Q2 2026) lets Velo402 itself earn a sliver of every agent-originated trade, turning the wallet layer into a sustainable, self-funding piece of infrastructure rather than a pure cost center.

---

## 13. Tech Stack Summary

|
 Layer 
|
 Technology 
|
|
---
|
---
|
|
 Frontend 
|
 Next.js 15 (App Router), TypeScript, Tailwind 
|
|
 On-chain language 
|
 Sui Move 
|
|
 Settlement standard 
|
`sui::payment_kit`
 (native Sui standard) 
|
|
 Access control / math 
|
 OpenZeppelin Contracts for Sui 
|
|
 Agent payment signaling 
|
 x402 protocol 
|
|
 Intent / authorization model 
|
 AP2 (Agent Payments Protocol) 
|
|
 Encrypted data access control 
|
 Seal (threshold encryption, on-chain policy) 
|
|
 Decentralized storage 
|
 Walrus 
|
|
 Verifiable off-chain compute 
|
 Nautilus (AWS Nitro Enclave) 
|
|
 On-chain liquidity / trading 
|
 DeepBook V3 — Spot, Margin, Predict 
|
|
 Sui TypeScript SDK 
|
`@mysten/sui`
 (gRPC client, 
`Transaction`
 builder) 
|
|
 Cache (non-security-critical) 
|
 Postgres or in-memory LRU 
|

---

## 14. Quickstart (README excerpt)

```bash
git clone https://github.com//velo402 && cd velo402
pnpm install

# 1. Publish the Move package (Treasury, PolicyCap, decision_gate, knowledge_policy)
sui client publish ./move --gas-budget 200000000

# 2. Register a PaymentRegistry namespace via the native Payment Kit
sui client call --package 0x2 --module payment_kit --function create_registry \
  --args  "velo402-knowledge"

# 3. Encrypt + publish the first Knowledge Agent dataset to Walrus via Seal
pnpm tsx scripts/encrypt-and-publish-dataset.ts

# 4. Run the Next.js control plane + agent SDK locally
pnpm dev

# Env vars
VELO402_PACKAGE_ID=
VELO402_PAYMENT_REGISTRY=
VELO402_SEAL_POLICY_PKG=
NAUTILUS_ENCLAVE_URL=
DEEPBOOK_ENV=testnet
```

---

### Closing line for the pitch deck

**Velo402 doesn't ask anyone to trust an AI agent. It asks them to do math once, sign once, and let the chain enforce the rest.**



Velo402
Autonomous Agent Knowledge & Data Liquidity Loop
Comprehensive Technical Specification & Product Requirements Document
Version 2.0  ·  Agentic Web Hackathon Submission
HACKATHON ALIGNMENT — AGENTIC WEB TRACK
 
Primary:   Sub-track 2 · Autonomous Agent Wallet  (SpenderCap + Deepbook + on-chain log + revocation)
Extended:  Sub-track 3 · Intent Engine            (text → PTB → guardian → human confirmation)
Extended:  Sub-track 1 · Autonomous Risk Guardian (live feeds + AI risk score + on-chain action)

 
1. Executive Summary & Problem Statement

AI agents on-chain face two irreconcilable constraints:
•	They cannot transact without persistent human approval — every micro-action stalls at the signature wall.
•	Knowledge providers have no trustless, permissionless billing channel that works at machine speed.

Velo402 resolves both simultaneously. A Move-native SpenderCap grants an AI agent a capped budget and protocol scope. An HTTP 402 middleware provides pay-per-query knowledge billing. Every payment is an atomic Sui PTB: verified on-chain, replayed-attack-proof, and logged immutably. No human approval required at runtime — and owner revocation is instant.

1.1  Why Sui Specifically — Not a Bolt-On
Every architectural decision exploits Sui primitives unavailable on other chains:

Sui Primitive	How Velo402 Uses It	Why Another Chain Cannot
Object Capability Model (SpenderCap)	Linear capability token enforces per-request ceiling + protocol scope on-chain atomically	Account-model chains require off-chain guard logic that can be bypassed
Programmable Transaction Blocks (PTBs)	Single atomic block: verify cap → split balance → transfer → emit event with request_hash	Multi-step flows on EVM require multiple transactions and coordination overhead
Shared Treasury Object	Any authorized agent key draws from shared pool without human co-signature	EVM requires multisig or proxy contracts with higher gas and latency
On-Chain Events (PaymentSettledEvent)	Event binds amount + request_hash + recipient immutably in one finality step	EVM logs are append-only but not first-class typed objects; harder to verify in middleware
Sub-500 ms Sui FullNode RPC	Middleware verifies tx finality before releasing API payload in < 1 round trip	Ethereum finality (12+ sec) makes per-request API gating impractical
Deepbook (Phase 2)	Agent executes real limit/market orders within SpenderCap scope	No native CLOB on EVM; DEX integrations require external protocols
zkLogin (Phase 2)	Human operator authenticates with OAuth to revoke SpenderCap — no seed phrase exposed	EVM wallets require hardware key management for operator revocation
Walrus / Seal (Phase 3)	Encrypted knowledge payloads stored with access unlocked by on-chain payment proof	Centralised storage breaks trustless knowledge market model

 
2. System Architecture

Velo402 uses a hybrid topology. Sub-second data state lives off-chain; policy enforcement, financial settlement, and audit logging live entirely on Sui.

2.1  Component Inventory
Layer	Component	Responsibility
On-Chain	treasury.move — Treasury	Shared SUI capital pool; tracks daily_spent; can be paused
On-Chain	treasury.move — OwnerCap	Human admin: withdraw, revoke agents, emergency pause, update limits
On-Chain	treasury.move — SpenderCap	Per-agent token: max_per_request, daily_limit, allowed_protocols, expires_at
On-Chain	treasury.move — Events	PaymentSettledEvent, SpenderAuthorizedEvent, SpenderRevokedEvent, TreasuryPausedEvent
Off-Chain	HTTP 402 Middleware	Intercepts requests, issues dynamic-priced challenges, verifies tx receipts via RPC
Off-Chain	Sui RPC Verifier	Queries FullNode for finality, balance changes, and event log within 500 ms
Off-Chain	Guardian Risk Engine	Pre-flight AI analysis: slippage, staleness, concentration, limit proximity, scope
Off-Chain	Intent Parser	plain-English → structured JSON → Sui PTB via LLM + schema validation
Off-Chain	PTB Compiler	Converts parsed intent JSON into a valid, signable Sui PTB stub
Off-Chain	Buyer Agent SDK	TypeScript fetch() wrapper that handles the full 402 cycle transparently
Off-Chain	Operator Dashboard	Real-time spend tracking, agent log, guardian alerts, revocation controls
Database	processed_payments	Idempotency lock — prevents digest replay across all API routes
Database	agent_activity_log	On-chain event mirror + enrichment for dashboard and analytics
Database	challenge_cache	60-second TTL for live 402 challenges
Database	risk_events	Guardian alert history, confirmation decisions, risk score trends

2.2  End-to-End Data Flow
EXECUTION AGENT (Buyer)              KNOWLEDGE AGENT MIDDLEWARE             SUI NETWORK
        │                                        │                               │
  1.  GET /api/market-inference ───────────────► │                               │
        │                                        │                               │
        │ ◄── 2. HTTP 402 Challenge ─────────────┤                               │
        │       { request_hash, amount_mist,     │                               │
        │         recipient, ptb_template,       │                               │
        │         price_breakdown }              │                               │
        │                                        │                               │
  3.  SDK builds PTB from template              │                               │
        │                                        │                               │
  4.  Broadcast PTB ─────────────────────────────┼──────────────────────────────► │
        │                                        │                    Validators   │
        │                                        │                    verify cap,  │
        │                                        │                    split funds, │
        │                                        │                    emit event   │
        │ ◄── 5. tx_digest + finality ───────────┼──────────────────────────────── │
        │                                        │                               │
  6.  Re-submit + x-velo402-payment-digest ─────► │                               │
        │                                        │                               │
        │                               7. Verify tx on Sui RPC ────────────────► │
        │                               8. Check event log & hash                 │
        │                               9. Write to processed_payments            │
        │                              10. Append to agent_activity_log           │
        │                                        │                               │
        │ ◄── 11. Data payload released ─────────┤                               │

 
3. On-Chain Smart Contracts (Move)

3.1  SpenderCap — Enhanced Field Specification
The v1 SpenderCap must be extended with four additional fields to support Sub-track 2 requirements:

Field	Type	v1?	Purpose	Enforcement
max_per_request	u64	✓	Hard ceiling per single settle_payment call	assert! in settle_payment
daily_limit	u64	NEW	Rolling 24-hour aggregate cap across all calls	Epoch counter in Treasury
allowed_protocols	vector<address>	NEW	Whitelist of recipient addresses (e.g. Deepbook market)	assert! checks recipient
expires_at	u64	NEW	Epoch timestamp after which cap is invalid	assert!(epoch <= expires_at)
scope_tag	vector<u8>	NEW	Human label stored on-chain (e.g. 'DEEPBOOK_ONLY')	Emitted in events

3.2  Treasury — Daily Limit Counter
public struct Treasury has key {
    id: UID,
    balance: Balance<SUI>,
    daily_spent: u64,          // resets each Sui epoch
    last_reset_epoch: u64,     // epoch of last daily reset
    paused: bool,              // emergency pause flag
}

settle_payment must enforce the daily limit before every transfer:
// Reset counter on new epoch
if (ctx.epoch() > treasury.last_reset_epoch) {
    treasury.daily_spent = 0;
    treasury.last_reset_epoch = ctx.epoch();
    event::emit(DailyLimitResetEvent { ... });
};
// Enforce budget ceiling
assert!(!treasury.paused, ETreasuryPaused);
assert!(treasury.daily_spent + amount <= spender_cap.daily_limit, EDailyLimitExceeded);
assert!(spender_cap.expires_at >= ctx.epoch(), ESpenderCapExpired);
assert!(vector::contains(&spender_cap.allowed_protocols, &recipient), EProtocolNotAllowed);

3.3  OwnerCap — Administrative Function Set
Function	Signature (summary)	Purpose
revoke_spender	(_: &OwnerCap, cap: SpenderCap)	Destroy SpenderCap; agent loses spending ability instantly
update_daily_limit	(_: &OwnerCap, treasury: &mut Treasury, new: u64)	Change rolling budget without redeploying contract
emergency_pause	(_: &OwnerCap, treasury: &mut Treasury)	Set paused = true; all settle_payment calls revert
emergency_resume	(_: &OwnerCap, treasury: &mut Treasury)	Clear pause flag
update_protocols	(_: &OwnerCap, cap: &mut SpenderCap, protocols: vector<address>)	Update allowed_protocols whitelist on live cap
withdraw	(_: &OwnerCap, treasury: &mut Treasury, amount: u64, ctx)	Extract SUI to operator wallet
extend_cap	(_: &OwnerCap, cap: &mut SpenderCap, new_expiry: u64)	Extend expires_at without revoking and reissuing

3.4  Complete On-Chain Event Schema
Event	Key Fields	Emitted When	Off-chain Consumer
PaymentSettledEvent	treasury_id, recipient, amount, request_hash, epoch	Successful settle_payment	402 middleware receipt check; activity log
SpenderAuthorizedEvent	cap_id, treasury_id, max_per_request, daily_limit, expires_at, scope_tag	authorize_spender called	Dashboard: new agent registered
SpenderRevokedEvent	cap_id, treasury_id, epoch	revoke_spender called	Dashboard: agent locked out
DailyLimitResetEvent	treasury_id, epoch, previous_spent	Epoch rollover during settle	Analytics: daily spend history
TreasuryPausedEvent	treasury_id, epoch, reason_hash	emergency_pause called	Risk guardian: critical alert
TreasuryResumedEvent	treasury_id, epoch	emergency_resume called	Risk guardian: recovery alert
WithdrawalEvent	treasury_id, recipient, amount, epoch	withdraw called	Operator accounting
ProtocolsUpdatedEvent	cap_id, old_protocols, new_protocols, epoch	update_protocols called	Dashboard: scope change audit

 
4. Off-Chain Layer — Enhanced Specification

4.1  HTTP 402 Middleware
4.1.1  Dynamic Pricing Engine
All endpoint costs are computed at runtime, not hardcoded. Factors:
Factor	Variable	Impact	Example
Payload complexity	token_count in request body	Linear: 1,000 MIST per token	500 tokens = 500,000 MIST
Model tier	model param in query	Tiered multiplier: 1x / 3x / 10x	GPT-4 class = 10× base
Demand surge	current_load from Redis gauge	Surge multiplier up to 2× at peak	Peak hour: 2× base
Freshness SLA	freshness param in query	realtime = 5× cached price	Cached default; realtime = 5×
The 402 response must include a price_breakdown object so buyer agents can audit the charge before paying.

4.1.2  Challenge Response — Full Schema
HTTP/1.1 402 Payment Required
Content-Type: application/json
 
{
  "version": "velo402/2.0",
  "request_hash": "<uuid-v4>",
  "amount_mist": 12500000,
  "price_breakdown": {
    "base_mist": 5000000, "token_surcharge_mist": 5000000,
    "model_multiplier": 1.5, "demand_multiplier": 1.0, "freshness_multiplier": 1.0
  },
  "recipient": "0x76c...wallet",
  "expires_in_seconds": 60,
  "ptb_template": { "treasury": "0x...", "spender_cap": "0x...",
    "amount": 12500000, "request_hash_bytes": [...] },
  "instruction": "Sign ptb_template, broadcast, submit digest via x-velo402-payment-digest."
}

4.1.3  Challenge Expiry & Anti-Abuse
•	Each request_hash expires after 60 seconds — stale challenges are rejected.
•	Per-IP rate limit: max 100 challenge generations per minute.
•	Per-treasury rate limit: max 500 challenge validations per minute.
•	The challenge_cache table TTL is enforced by pg_cron purging every minute.
•	Once a request_hash is consumed (linked to a processed tx_digest), it is permanently closed.

4.2  Guardian Risk Engine (New — Sub-track 1 & 3)
Before any PTB is signed, the Guardian performs a pre-flight risk analysis. If any BLOCK-level risk is detected, execution is halted. WARN-level risks require explicit confirmation before proceeding.

4.2.1  Risk Class Coverage (Minimum 2 Required; Velo402 Implements 6)
Risk Class	Detection Method	Threshold	Response
High Slippage	Query Deepbook order book depth; compute price impact	> 1% price impact on order size	WARN: explains market impact in plain language
Stale Oracle	Fetch price feed timestamp; compare to current epoch time	Price data > 30 seconds old	BLOCK: cannot safely compute fair price
Concentration Risk	Analyse agent wallet post-trade allocation	Single asset > 80% of portfolio	WARN: flags concentration; requests confirmation
Daily Limit Proximity	treasury.daily_spent + amount vs daily_limit	< 10% remaining daily budget	WARN: shows remaining budget; flags near-exhaustion
Protocol Scope Violation	recipient vs SpenderCap.allowed_protocols on-chain	Recipient not in whitelist	BLOCK: hard rejection; logs violation attempt
Duplicate Intent Detection	Query agent_activity_log for identical params in last 5 min	Exact match within 300 seconds	WARN: surfaces possible agent loop condition

4.2.2  Guardian Output Schema
{
  "risk_score": 72,
  "risk_level": "MEDIUM",
  "blocks": ["STALE_ORACLE"],
  "warnings": ["HIGH_SLIPPAGE", "CONCENTRATION_RISK"],
  "human_summary": "Cannot proceed: price data is 45s old (threshold: 30s). 
    Additionally, this order will move the market by 2.1% and leave
    your portfolio 88% concentrated in USDC.",
  "requires_confirmation": true,
  "confirmation_token": "<uuid>",
  "expires_in_seconds": 30,
  "details": {
    "slippage_bps": 210,
    "oracle_age_seconds": 45,
    "post_trade_usdc_pct": 88
  }
}
When requires_confirmation is true, the buyer agent or human operator must respond with the confirmation_token in x-velo402-confirm within 30 seconds. Execution is blocked until confirmation is received or the token expires.

4.3  Intent Parser (New — Sub-track 3)
Converts plain-English financial goals into Sui PTBs. Routes through the Guardian and produces a human-readable preview before any signing occurs.

4.3.1  Intent → PTB → Execution Pipeline
1.	User submits plain-English intent: 'Swap 100 USDC for SUI at best price, max 0.5% slippage.'
2.	Intent Normaliser (claude-sonnet-4-6 via Anthropic API) outputs structured JSON: { action, asset_in, asset_out, amount, slippage_bps, urgency, ttl }.
3.	Schema Validator rejects ambiguous or unsupported intents with a plain-language error.
4.	PTB Compiler generates a valid, signable Sui PTB targeting the Deepbook market.
5.	Guardian Risk Engine runs pre-flight analysis on the compiled PTB.
6.	Preview Generator produces a human-readable breakdown of exactly what will happen.
7.	User sees Preview + Guardian summary; must click Confirm (or SDK caller receives guardian output and must call confirmAndExecute).
8.	On confirmation, PTB is signed and broadcast; tx_digest is returned to caller.

4.3.2  Human-Readable PTB Preview — Required Fields
Preview Field	Example Output
Action	Swapping 100 USDC for approximately 42.7 SUI
Venue	Via Deepbook USDC/SUI market (0x...pool)
Cost breakdown	Gas: ~0.002 SUI  ·  Protocol fee: 0.01 SUI  ·  Slippage tolerance: 0.5%
Worst case	Minimum received: 42.49 SUI (if max slippage is hit)
Risk summary	Guardian: MEDIUM risk — 1 warning (high slippage). Tap to view details.
On-chain footprint	Creates 2 Move calls and emits 1 PaymentSettledEvent
Budget impact	Uses 12,500,000 MIST (82% of your daily budget; 2,250,000 MIST remaining)

 
5. Database Schema — Complete

processed_payments
CREATE TABLE processed_payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digest          VARCHAR(255) NOT NULL UNIQUE,
    request_hash    VARCHAR(255) NOT NULL UNIQUE,
    amount_mist     BIGINT NOT NULL,
    buyer_address   VARCHAR(255),
    treasury_id     VARCHAR(255),
    endpoint_path   VARCHAR(500),
    processed_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pd_digest  ON processed_payments(digest);
CREATE INDEX idx_pd_buyer   ON processed_payments(buyer_address);

agent_activity_log
CREATE TABLE agent_activity_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_digest       VARCHAR(255) NOT NULL UNIQUE,
    agent_address   VARCHAR(255) NOT NULL,
    treasury_id     VARCHAR(255) NOT NULL,
    action_type     VARCHAR(100) NOT NULL,   -- 'payment', 'deepbook_order', 'intent'
    amount_mist     BIGINT,
    recipient       VARCHAR(255),
    scope_tag       VARCHAR(255),
    risk_score      INTEGER,
    guardian_flags  JSONB,
    confirmed_by    VARCHAR(100),            -- 'agent' | 'human' | 'auto'
    epoch           BIGINT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_aal_agent    ON agent_activity_log(agent_address, created_at DESC);
CREATE INDEX idx_aal_treasury ON agent_activity_log(treasury_id, created_at DESC);

challenge_cache
CREATE TABLE challenge_cache (
    request_hash    VARCHAR(255) PRIMARY KEY,
    amount_mist     BIGINT NOT NULL,
    ptb_template    JSONB,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Auto-purge via pg_cron:
SELECT cron.schedule('*/1 * * * *', $$DELETE FROM challenge_cache WHERE expires_at < NOW()$$);

risk_events
CREATE TABLE risk_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_hash        VARCHAR(255),
    agent_address       VARCHAR(255),
    risk_class          VARCHAR(100) NOT NULL,
    risk_level          VARCHAR(20)  NOT NULL,   -- 'LOW'|'MEDIUM'|'HIGH'|'BLOCK'
    risk_score          INTEGER NOT NULL,
    human_summary       TEXT,
    was_blocked         BOOLEAN DEFAULT FALSE,
    was_confirmed       BOOLEAN,
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

 
6. Buyer Agent SDK

A TypeScript SDK must be published to demonstrate that Velo402 is genuinely usable as infrastructure — not just a demo with custom integration per agent.

6.1  API Surface
Method	Signature	Description
Constructor	new Velo402Client({ suiClient, keypair, spenderCap, treasury })	Wires up signing keys and cap references
fetch()	fetch(url, options?) → Promise<Response>	Drop-in replacement for fetch() — handles full 402 cycle transparently
parseIntent()	parseIntent(text: string) → Promise<IntentResult>	plain-English → structured PTB + Guardian output + Preview
confirmAndExecute()	confirmAndExecute(token: string) → Promise<string>	Signs and broadcasts pre-approved PTB; returns tx_digest
getBudgetStatus()	getBudgetStatus() → Promise<BudgetStatus>	Queries live treasury state: daily_spent, daily_limit, remaining
getActivityLog()	getActivityLog(limit?: number) → Promise<Activity[]>	Returns enriched activity history from agent_activity_log
revoke()	revoke() → void	Operator: destroys SpenderCap on-chain; agent loses access

6.2  Transparent 402 Cycle Inside fetch()
9.	Call target URL. If 200, return response immediately.
10.	If 402, extract challenge: amount, recipient, request_hash, ptb_template, expires_in_seconds.
11.	Check challenge_cache: if expired, throw ChallengeExpiredError.
12.	Run Guardian on ptb_template. If any BLOCK, throw GuardianBlockError with human_summary.
13.	Emit 'guardian:warning' event for WARNs — caller decides to abort or confirm.
14.	Sign ptb_template using keypair + spenderCap. Broadcast PTB to Sui. Await finality.
15.	Re-submit original request with x-velo402-payment-digest header set to tx_digest.
16.	Return response to caller. Log to agent_activity_log in background.

 
7. Human Operator Dashboard

The dashboard is architecturally required — not cosmetic. It must demonstrate owner revocation (Sub-track 2) and human override (Sub-tracks 1 and 3) in a live, demoed flow.

7.1  Required Panels
Panel	Must Include
Treasury Overview	Live SUI balance + USD equivalent; daily_spent / daily_limit gauge ring; 7-day spend chart; pause/resume controls
Agent Activity Feed	Real-time stream of PaymentSettledEvents: tx_digest, amount, endpoint, risk_score, epoch; filterable by agent/date
Guardian Alert Feed	Active BLOCK and WARN alerts with severity badge; one-click Override or Block confirmation with audit note
SpenderCap Manager	Table of all active caps: scope_tag, expires_at, daily_limit, current_day_spent; Revoke button per row
Intent History	Log of all intent submissions: raw text, parsed JSON, PTB preview, guardian outcome, confirmation decision
Risk Score Timeline	Line chart of risk_score per transaction over last 24h; threshold lines for WARN and BLOCK levels
Budget Burn Rate	Projected daily budget exhaustion time based on rolling 1-hour spend rate; alert if < 2 hours remaining

7.2  Owner Revocation — Demo Flow (Sub-track 2 Requirement)
The demo must show revocation working end-to-end in under 30 seconds:
17.	Operator clicks Revoke on a SpenderCap row in the dashboard.
18.	Dashboard calls the Sui SDK to invoke revoke_spender(_: &OwnerCap, cap: SpenderCap) — destroys the cap object on-chain.
19.	SpenderRevokedEvent is emitted on Sui; off-chain listener marks cap as revoked in agent_activity_log.
20.	Dashboard shows live confirmation with tx_digest and block height.
21.	Any subsequent settle_payment call from the revoked agent's key fails at the Move assert! with EUnauthorizedSpender.
22.	Agent Activity Feed updates in real time showing 'REVOKED' status.

 
8. Phase Roadmap

Phase	Scope	Sui Primitives Used
Phase 1 — Core (Hackathon MVP)	treasury.move with SpenderCap + daily_limit + pause; HTTP 402 middleware; Guardian with 6 risk classes; agent_activity_log; Operator dashboard with revocation demo	Shared Objects, Object Capabilities, PTBs, On-chain Events, Sui FullNode RPC
Phase 2 — Deepbook Integration	Real Deepbook limit/market orders within SpenderCap.allowed_protocols scope; SDK fetch() wraps Deepbook order execution; per-order risk scoring; budget ceiling enforced per-order	Deepbook order book, PTBs (multi-call), zkLogin for operator OAuth auth
Phase 3 — Decentralised Knowledge Vault	Walrus-stored encrypted knowledge payloads; Seal access control gates unlock on proof of PaymentSettledEvent; knowledge provider registration on-chain	Walrus distributed storage, Seal access control, Move policy objects
Phase 4 — Multi-Agent Treasury	Hierarchical SpenderCap delegation (sub-agents with sub-limits); inter-agent payment routing; DAO override via multi-sig OwnerCap; cross-treasury settlement	Sui multi-sig, zkLogin delegation, Move generics for typed caps

 
9. Hackathon Compliance Checklist

Every sub-track requirement is traceable to a specific Velo402 component:

9.1  Sub-track 2 — Autonomous Agent Wallet
Requirement	Velo402 Implementation
✓ Real Deepbook orders	Phase 2: SpenderCap.allowed_protocols scopes agent to Deepbook markets; SDK executes real limit/market orders
✓ Self-enforced budget ceiling	SpenderCap.max_per_request + Treasury.daily_limit enforced atomically in Move assert! — no off-chain guard needed
✓ On-chain activity log	PaymentSettledEvent + SpenderAuthorizedEvent + SpenderRevokedEvent emitted on every action; mirrored to agent_activity_log
✓ Owner revocation demo	Dashboard Revoke button calls revoke_spender OwnerCap function; destroys cap object on-chain; verified in demo flow (Section 7.2)

9.2  Sub-track 3 — Intent Engine
Requirement	Velo402 Implementation
✓ text → PTB → execution flow	Intent Parser (claude-sonnet-4-6) → PTB Compiler → Guardian → SDK broadcast (Section 4.3.1)
✓ Human-readable PTB preview	7-field Preview output shown before any signing (Section 4.3.2)
✓ Guardian catches ≥ 2 risk classes	Guardian implements 6 risk classes: slippage, stale oracle, concentration, limit proximity, scope violation, duplicate intent (Section 4.2.1)
✓ Explicit confirmation step	Guardian issues confirmation_token; execution blocked until token received within 30 seconds (Section 4.2.2)

9.3  Sub-track 1 — Autonomous Risk Guardian
Requirement	Velo402 Implementation
✓ Live price feed	Guardian queries Sui oracle and Deepbook order book in real time for every PTB pre-flight
✓ Visible AI risk score	risk_score (0-100) + risk_level emitted in guardian output; charted in dashboard Risk Score Timeline panel
✓ Autonomous on-chain action	TreasuryPausedEvent: Guardian can trigger emergency_pause via OwnerCap if risk_score > 95 and block count is exceeded
✓ Human override mechanism	Dashboard Guardian Alert Feed: operator can Override any BLOCK with an audit note; override logged to risk_events

Velo402 v2.0  ·  This document supersedes all prior versions.
All Sui primitive usage is load-bearing — not decorative.
Sub-track 2 is the primary submission. Sub-tracks 1 and 3 are demonstrated as integrated extensions.

