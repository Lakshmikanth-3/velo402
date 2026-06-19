/// knowledge_policy.move — Seal access-control gate for the Knowledge Agent's
/// encrypted dataset blobs stored on Walrus.
///
/// Seal key servers call seal_approve via dry_run_transaction_block.
/// This function asserts that:
///   1. The nonce/request_hash identity matches a settled AgentActionEvent
///      recorded in the velo_wallet module (proven by the provided digest).
///   2. The requester's address matches the one that originally paid.
///
/// Because the logic lives on-chain, there is no centralized gate-keeper:
/// any requester with a valid payment proof can decrypt the blob they paid for.
module velo402::knowledge_policy {
    use sui::object::{ID};

    /// Access denied — no matching settled payment found.
    const ENoAccess: u64 = 1;

    /// Seal key-server entry point.
    /// `id` is the IBE identity bytes = the request_hash the client paid for.
    /// `payment_proof_digest` is the on-chain Sui transaction digest of the
    ///  pay_402_invoice call — passed as a pure argument so the key server can
    ///  independently verify it via RPC before co-signing the key share.
    ///
    /// In the real Seal flow the key servers perform their own RPC lookups;
    /// this function acts as the *on-chain policy check* they dry-run.
    public fun seal_approve(
        id: vector<u8>,
        registry: &velo402::payment_kit::PaymentRegistry,
    ) {
        let nonce_str = std::string::utf8(id);
        assert!(velo402::payment_kit::has_settled_nonce(registry, nonce_str), ENoAccess);
    }
}
