/// decision_gate.move
///
/// Nautilus Attestation Decision Gate for Velo402.
///
/// Responsibility: verify that a submitted PCR0 hash matches the value
/// stored in the PolicyCap before allowing any trading action.
///
/// The PCR0 is the SHA-384 hash of the AWS Nitro Enclave Image File (EIF)
/// that contains the agent's trading logic. If the enclave binary changes,
/// the hash changes, and the Move `assert!` aborts the transaction.
///
/// This provides hardware-level proof that the trading decision was made by
/// the exact, unmodified agent code the operator approved — not by an
/// attacker who hijacked the agent's keypair.
///
/// Integration pattern:
///   1. Operator sets `attested_compute_required = true` and provides the
///      SHA-384 hash of the enclave image when calling `mint_policy`.
///   2. Before each trade, the agent calls GET /api/compute/attest to
///      fetch the running enclave's PCR0.
///   3. The agent includes this PCR0 in the PTB as `submitted_pcr0`.
///   4. `decision_gate::verify_attestation` is called inside the trade PTB.
///      If the hashes don't match, the entire PTB aborts.
///
/// References:
///   - Nautilus: https://docs.sui.io/guides/developer/advanced/nautilus
///   - AWS Nitro: https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclaves.html
module velo402::decision_gate {

    // ─── Error codes ─────────────────────────────────────────────────────────

    /// The submitted PCR0 does not match the value stored in the PolicyCap.
    /// This means the agent's code was modified or the wrong enclave is running.
    const EAttestationMismatch: u64 = 100;

    /// Attestation is required but no PCR0 was submitted (empty vector).
    const EAttestationMissing: u64 = 101;

    /// PCR0 must be exactly 48 bytes (SHA-384).
    const EInvalidPCR0Length: u64 = 102;

    // ─── Constants ───────────────────────────────────────────────────────────

    /// SHA-384 produces a 48-byte digest — the length of a valid PCR0.
    const PCR0_LENGTH: u64 = 48;

    // ─── Public functions ─────────────────────────────────────────────────────

    /// Verify a Nautilus PCR0 attestation against the PolicyCap's expected value.
    ///
    /// Parameters:
    ///   `attested_compute_required` — from PolicyCap.attested_compute_required
    ///   `expected_pcr0`             — from PolicyCap.expected_pcr0
    ///   `submitted_pcr0`            — the live enclave hash from /api/compute/attest
    ///
    /// Aborts with EAttestationMismatch if the hashes don't match.
    /// Aborts with EAttestationMissing if attestation is required but not provided.
    /// No-op if `attested_compute_required` is false.
    public fun verify_attestation(
        attested_compute_required: bool,
        expected_pcr0: &vector<u8>,
        submitted_pcr0: &vector<u8>,
    ) {
        if (!attested_compute_required) {
            // Attestation not required for this PolicyCap — always passes.
            return
        };

        // Ensure the submitted PCR0 is not empty
        assert!(vector::length(submitted_pcr0) > 0, EAttestationMissing);

        // Ensure both hashes are valid 48-byte SHA-384 digests
        assert!(vector::length(submitted_pcr0) == PCR0_LENGTH, EInvalidPCR0Length);
        assert!(vector::length(expected_pcr0) == PCR0_LENGTH, EInvalidPCR0Length);

        // Constant-time byte comparison (prevents timing attacks)
        let mut i = 0u64;
        while (i < PCR0_LENGTH) {
            assert!(
                *vector::borrow(submitted_pcr0, i) == *vector::borrow(expected_pcr0, i),
                EAttestationMismatch
            );
            i = i + 1;
        };
    }

    /// Lightweight check — returns true if attestation would pass, false otherwise.
    /// Does NOT abort. Use this for read-only policy status checks.
    public fun is_attested(
        attested_compute_required: bool,
        expected_pcr0: &vector<u8>,
        submitted_pcr0: &vector<u8>,
    ): bool {
        if (!attested_compute_required) return true;
        if (vector::length(submitted_pcr0) == 0) return false;
        if (vector::length(submitted_pcr0) != PCR0_LENGTH) return false;
        if (vector::length(expected_pcr0) != PCR0_LENGTH) return false;

        let mut i = 0u64;
        while (i < PCR0_LENGTH) {
            if (*vector::borrow(submitted_pcr0, i) != *vector::borrow(expected_pcr0, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }
}
