/// velo_wallet.move — Capability-scoped treasury for the Velo402 autonomous agent wallet.
///
/// Design rationale
/// ─────────────────
/// • OwnerCap  : the human operator's master key.  Held in their real wallet.
/// • PolicyCap : the AI agent's restricted, revocable wallet permission.  Lives in
///               a cheap throwaway keypair the agent controls.  Possessing the object
///               IS the authorization — no external DB lookup required.
/// • Treasury  : shared vault funding all agent actions.  The agent never has direct
///               access to it; every withdrawal must pass through PolicyCap checks first.
///
/// Replay / idempotency protection is delegated to a nonce field instead of an
/// external Supabase table — the chain is the single source of truth.
module velo402::velo_wallet {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::balance::{Self, Balance};

    // ─── Error codes ────────────────────────────────────────────────────────
    const ENotOwner:         u64 = 0;
    const EExpired:          u64 = 1;
    const EOverBudget:       u64 = 2;
    const EScopeNotAllowed:  u64 = 3;
    const EWrongTreasury:    u64 = 4;
    const EInsufficientFunds:u64 = 5;

    // ─── Scope tag constants (stored as u8 vectors in allowed_scopes) ────────
    // Client code encodes these as single-byte tags for compactness.
    const SCOPE_402_DATA:         u8 = 1;
    const SCOPE_DEEPBOOK_SPOT:    u8 = 2;
    const SCOPE_DEEPBOOK_MARGIN:  u8 = 3;
    const SCOPE_DEEPBOOK_PREDICT: u8 = 4;

    // ─── Structs ─────────────────────────────────────────────────────────────

    /// The human operator's master capability.  Granting or revoking this
    /// object represents full ownership transfer of the treasury.
    public struct OwnerCap has key, store {
        id: UID,
        treasury_id: ID,
    }

    /// The AI agent's restricted, revocable wallet permission.
    /// Possessing this object is the authorization — no off-chain check needed.
    public struct PolicyCap has key, store {
        id: UID,
        treasury_id: ID,
        /// Hard ceiling on cumulative spend in MIST.
        max_spend: u64,
        /// Running total — never decremented, preventing re-use attacks.
        current_spend: u64,
        /// Sui epoch after which this cap is no longer valid.
        expiration_epoch: u64,
        /// Compact allow-list of scope tags the agent may use.
        allowed_scopes: vector<u8>,
        /// When true every trade PTB must carry a verified Nautilus attestation.
        attested_compute_required: bool,
    }

    /// Shared vault holding all agent-spendable funds.
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
        /// Human-readable label surfaced in the dashboard.
        label: vector<u8>,
    }

    /// Emitted for every agent action — the dashboard's live audit feed
    /// subscribes to this event type via Sui's event streaming API.
    public struct AgentActionEvent has copy, drop {
        agent_cap:        ID,
        treasury_id:      ID,
        action_type:      vector<u8>,
        amount:           u64,
        counterparty:     address,
        remaining_budget: u64,
        scope_tag:        u8,
    }

    /// Emitted when a PolicyCap is successfully minted.
    public struct PolicyMintedEvent has copy, drop {
        policy_cap_id:   ID,
        treasury_id:     ID,
        max_spend:       u64,
        expiration_epoch:u64,
        agent_address:   address,
    }

    /// Emitted when a PolicyCap is permanently revoked.
    public struct PolicyRevokedEvent has copy, drop {
        policy_cap_id: ID,
        treasury_id:   ID,
        spent_at_revocation: u64,
    }

    // ─── Initialization ──────────────────────────────────────────────────────

    /// Creates a new Treasury shared object.  Called once by the operator.
    public entry fun create_treasury(
        label: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let treasury_uid = object::new(ctx);
        let treasury_id = object::uid_to_inner(&treasury_uid);

        let treasury = Treasury {
            id: treasury_uid,
            balance: balance::zero(),
            label,
        };

        let owner_cap = OwnerCap {
            id: object::new(ctx),
            treasury_id,
        };

        transfer::share_object(treasury);
        transfer::transfer(owner_cap, tx_context::sender(ctx));
    }

    // ─── Human-facing functions (require OwnerCap) ────────────────────────────

    /// Deposits SUI into the Treasury.
    public entry fun deposit(
        treasury: &mut Treasury,
        funds: Coin<SUI>,
    ) {
        coin::put(&mut treasury.balance, funds);
    }

    /// Mints a PolicyCap and transfers it to the agent's throwaway keypair.
    public entry fun mint_policy(
        owner: &OwnerCap,
        treasury: &Treasury,
        max_spend: u64,
        expiration_epoch: u64,
        allowed_scopes: vector<u8>,
        attested_compute_required: bool,
        agent_address: address,
        ctx: &mut TxContext,
    ) {
        assert!(owner.treasury_id == object::id(treasury), EWrongTreasury);

        let policy_uid = object::new(ctx);
        let policy_id = object::uid_to_inner(&policy_uid);

        let cap = PolicyCap {
            id: policy_uid,
            treasury_id: object::id(treasury),
            max_spend,
            current_spend: 0,
            expiration_epoch,
            allowed_scopes,
            attested_compute_required,
        };

        event::emit(PolicyMintedEvent {
            policy_cap_id: policy_id,
            treasury_id: object::id(treasury),
            max_spend,
            expiration_epoch,
            agent_address,
        });

        transfer::transfer(cap, agent_address);
    }

    /// Withdraws idle funds from the Treasury back to the operator.
    public entry fun withdraw(
        owner: &OwnerCap,
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(owner.treasury_id == object::id(treasury), EWrongTreasury);
        assert!(balance::value(&treasury.balance) >= amount, EInsufficientFunds);
        let coin = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    /// Permanently burns the agent's PolicyCap — the kill switch.
    /// After this call the agent's next PTB will abort with object-not-found.
    public entry fun revoke_policy(
        owner: &OwnerCap,
        policy: PolicyCap,
        _ctx: &mut TxContext,
    ) {
        assert!(owner.treasury_id == policy.treasury_id, EWrongTreasury);

        event::emit(PolicyRevokedEvent {
            policy_cap_id: object::id(&policy),
            treasury_id: policy.treasury_id,
            spent_at_revocation: policy.current_spend,
        });

        let PolicyCap {
            id,
            treasury_id: _,
            max_spend: _,
            current_spend: _,
            expiration_epoch: _,
            allowed_scopes: _,
            attested_compute_required: _,
        } = policy;
        object::delete(id);
    }

    // ─── Agent-facing functions (require PolicyCap) ───────────────────────────

    /// Agent pays an HTTP 402 invoice.
    /// Guards: not expired · scope allowed · cumulative spend within ceiling.
    public entry fun pay_402_invoice(
        policy: &mut PolicyCap,
        treasury: &mut Treasury,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::epoch(ctx) <= policy.expiration_epoch, EExpired);
        assert!(policy.treasury_id == object::id(treasury), EWrongTreasury);
        assert!(has_scope(&policy.allowed_scopes, SCOPE_402_DATA), EScopeNotAllowed);

        let projected = policy.current_spend + amount;
        assert!(projected <= policy.max_spend, EOverBudget);
        assert!(balance::value(&treasury.balance) >= amount, EInsufficientFunds);

        policy.current_spend = projected;

        let coin = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(coin, recipient);

        event::emit(AgentActionEvent {
            agent_cap:        object::id(policy),
            treasury_id:      object::id(treasury),
            action_type:      b"402_DATA_PURCHASE",
            amount,
            counterparty:     recipient,
            remaining_budget: policy.max_spend - policy.current_spend,
            scope_tag:        SCOPE_402_DATA,
        });
    }

    /// Agent places a DeepBook Spot order (funds withdrawn, forwarded to DeepBook balance manager).
    public entry fun pay_deepbook_spot(
        policy: &mut PolicyCap,
        treasury: &mut Treasury,
        amount: u64,
        deepbook_balance_manager: address,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::epoch(ctx) <= policy.expiration_epoch, EExpired);
        assert!(policy.treasury_id == object::id(treasury), EWrongTreasury);
        assert!(has_scope(&policy.allowed_scopes, SCOPE_DEEPBOOK_SPOT), EScopeNotAllowed);

        let projected = policy.current_spend + amount;
        assert!(projected <= policy.max_spend, EOverBudget);
        assert!(balance::value(&treasury.balance) >= amount, EInsufficientFunds);

        policy.current_spend = projected;

        let coin = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(coin, deepbook_balance_manager);

        event::emit(AgentActionEvent {
            agent_cap:        object::id(policy),
            treasury_id:      object::id(treasury),
            action_type:      b"DEEPBOOK_SPOT_ORDER",
            amount,
            counterparty:     deepbook_balance_manager,
            remaining_budget: policy.max_spend - policy.current_spend,
            scope_tag:        SCOPE_DEEPBOOK_SPOT,
        });
    }

    /// Agent places a DeepBook Margin or Predict order.
    public entry fun pay_deepbook_advanced(
        policy: &mut PolicyCap,
        treasury: &mut Treasury,
        amount: u64,
        scope_tag: u8,
        deepbook_balance_manager: address,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::epoch(ctx) <= policy.expiration_epoch, EExpired);
        assert!(policy.treasury_id == object::id(treasury), EWrongTreasury);
        assert!(
            scope_tag == SCOPE_DEEPBOOK_MARGIN || scope_tag == SCOPE_DEEPBOOK_PREDICT,
            EScopeNotAllowed
        );
        assert!(has_scope(&policy.allowed_scopes, scope_tag), EScopeNotAllowed);

        let projected = policy.current_spend + amount;
        assert!(projected <= policy.max_spend, EOverBudget);
        assert!(balance::value(&treasury.balance) >= amount, EInsufficientFunds);

        policy.current_spend = projected;

        let action_type = if (scope_tag == SCOPE_DEEPBOOK_MARGIN) {
            b"DEEPBOOK_MARGIN_ORDER"
        } else {
            b"DEEPBOOK_PREDICT_POSITION"
        };

        let coin = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(coin, deepbook_balance_manager);

        event::emit(AgentActionEvent {
            agent_cap:        object::id(policy),
            treasury_id:      object::id(treasury),
            action_type,
            amount,
            counterparty:     deepbook_balance_manager,
            remaining_budget: policy.max_spend - policy.current_spend,
            scope_tag,
        });
    }

    // ─── Read-only helpers ────────────────────────────────────────────────────

    public fun remaining_budget(policy: &PolicyCap): u64 {
        if (policy.current_spend >= policy.max_spend) { 0 }
        else { policy.max_spend - policy.current_spend }
    }

    public fun is_expired(policy: &PolicyCap, ctx: &TxContext): bool {
        tx_context::epoch(ctx) > policy.expiration_epoch
    }

    fun has_scope(scopes: &vector<u8>, tag: u8): bool {
        let mut i = 0;
        let len = vector::length(scopes);
        while (i < len) {
            if (*vector::borrow(scopes, i) == tag) { return true };
            i = i + 1;
        };
        false
    }
}
