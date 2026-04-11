pragma circom 2.1.6;

/*
 * ReputationThreshold.circom
 *
 * Proves that an identity's reputation score is >= threshold
 * WITHOUT revealing the actual score.
 *
 * Public inputs:
 *   - threshold: the minimum score required
 *   - identityCommitment: H(identityId || secret)
 *   - contextCommitment: H(context)
 *
 * Private inputs:
 *   - score: the actual reputation score
 *   - identityId: the identity's ID
 *   - secret: a private randomness value
 *   - merkleRoot: the on-chain Merkle root
 *   - merklePath[levels]: sibling hashes in the Merkle tree
 *   - merklePathIndices[levels]: 0=left, 1=right at each level
 *
 * Constraints:
 *   1. score >= threshold
 *   2. identityCommitment = Poseidon(identityId, secret)
 *   3. Merkle proof verification: score is in the committed tree
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template MerkleProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];
        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[levels];
}

template ReputationThreshold(levels) {
    // Public inputs
    signal input threshold;
    signal input identityCommitment;
    signal input merkleRoot;

    // Private inputs
    signal input score;
    signal input identityId;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // 1. Verify score >= threshold
    component gte = GreaterEqThan(32);
    gte.in[0] <== score;
    gte.in[1] <== threshold;
    gte.out === 1;

    // 2. Verify identity commitment
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== identityId;
    poseidon.inputs[1] <== secret;
    identityCommitment === poseidon.out;

    // 3. Verify Merkle proof
    // Leaf = Poseidon(identityId, score)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== identityId;
    leafHasher.inputs[1] <== score;

    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== leafHasher.out;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }
    merkleRoot === merkleProof.root;
}

component main {public [threshold, identityCommitment, merkleRoot]} = ReputationThreshold(20);
