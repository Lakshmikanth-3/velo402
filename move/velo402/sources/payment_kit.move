module velo402::payment_kit {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use std::string::String;

    const EPaymentAlreadyExists: u64 = 0;

    /// The registry that tracks settled nonces (request_hashes)
    public struct PaymentRegistry has key {
        id: UID,
        namespace: String,
        settled_payments: Table<String, u64>, // Maps nonce -> timestamp_ms
    }

    /// The physical receipt returned to the caller
    public struct PaymentReceipt has drop {
        nonce: String,
        amount: u64,
        recipient: address,
    }

    public struct PaymentEvent has copy, drop {
        nonce: String,
        amount: u64,
        recipient: address,
        timestamp_ms: u64,
    }

    /// Create a new registry
    public entry fun create_registry(namespace: String, ctx: &mut TxContext) {
        let registry = PaymentRegistry {
            id: object::new(ctx),
            namespace,
            settled_payments: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Process a payment and register the nonce to prevent replay attacks
    public fun process_registry_payment<T>(
        registry: &mut PaymentRegistry,
        nonce: String,
        payment: Coin<T>,
        recipient: address,
        clock: &Clock,
        _ctx: &mut TxContext
    ): PaymentReceipt {
        // Idempotency / Replay protection: ensure nonce is unique
        assert!(!table::contains(&registry.settled_payments, nonce), EPaymentAlreadyExists);

        let amount = coin::value(&payment);
        let timestamp_ms = clock::timestamp_ms(clock);
        
        table::add(&mut registry.settled_payments, nonce, timestamp_ms);

        event::emit(PaymentEvent {
            nonce,
            amount,
            recipient,
            timestamp_ms,
        });

        // Send the funds
        transfer::public_transfer(payment, recipient);

        PaymentReceipt {
            nonce,
            amount,
            recipient,
        }
    }

    /// Check if a nonce has settled (used by Seal policies)
    public fun has_settled_nonce(
        registry: &PaymentRegistry,
        nonce: String
    ): bool {
        table::contains(&registry.settled_payments, nonce)
    }
}
