pragma circom 2.1.6;

/*
 * MembershipProof.circom
 *
 * Proves that an identity is a member of a group (defined by a Merkle root)
 * WITHOUT revealing which identity they are.
 *
 * Public inputs:
 *   - groupRoot: Merkle root of the membership set
 *   - nullifierHash: prevents double-use of the same proof
 *
 * Private inputs:
 *   - identityId: the identity's ID
 *   - secret: private randomness
 *   - pathElements[levels]: Merkle siblings
 *   - pathIndices[levels]: Merkle path direction
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
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

template MembershipProof(levels) {
    // Public inputs
    signal input groupRoot;
    signal input nullifierHash;

    // Private inputs
    signal input identityId;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // 1. Compute identity commitment
    component commitment = Poseidon(2);
    commitment.inputs[0] <== identityId;
    commitment.inputs[1] <== secret;

    // 2. Compute nullifier to prevent replay
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== secret;
    nullifier.inputs[1] <== groupRoot;
    nullifierHash === nullifier.out;

    // 3. Verify membership via Merkle proof
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== commitment.out;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }
    groupRoot === merkleProof.root;
}

component main {public [groupRoot, nullifierHash]} = MembershipProof(20);
