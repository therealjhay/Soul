// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReputationAnchor
 * @notice Anchors off-chain reputation scores on-chain as Merkle roots and
 *         individual score commitments. Enables trustless on-chain verification
 *         of reputation claims by consumer applications.
 *
 *         The off-chain computation engine calls `anchorRoot` periodically.
 *         Individual scores can be verified against the current root using
 *         standard Merkle proofs (see `verifyScore`).
 */
contract ReputationAnchor is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant ANCHORER_ROLE = keccak256("ANCHORER_ROLE");

    struct AnchorRecord {
        bytes32 merkleRoot;    // Merkle root of all reputation scores in this epoch
        uint256 epoch;         // Sequential epoch number
        uint256 timestamp;     // Block timestamp of anchoring
        string  metadataURI;   // Off-chain index of this epoch's score set
        bytes32 prevRoot;      // Previous root for chain linking
    }

    // epoch => AnchorRecord
    mapping(uint256 => AnchorRecord) private _anchors;

    // Latest epoch
    uint256 public latestEpoch;

    // Individual score commitments: identityId => context => scoreHash
    mapping(uint256 => mapping(string => bytes32)) private _scoreCommitments;

    // ─── Events ────────────────────────────────────────────────────────────────

    event RootAnchored(
        uint256 indexed epoch,
        bytes32 indexed merkleRoot,
        bytes32 prevRoot,
        string  metadataURI,
        uint256 timestamp
    );

    event ScoreCommitted(
        uint256 indexed identityId,
        string  indexed context,
        bytes32 scoreHash,
        uint256 timestamp
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address anchorer) {
        require(admin != address(0), "ReputationAnchor: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        if (anchorer != address(0)) {
            _grantRole(ANCHORER_ROLE, anchorer);
        }
    }

    // ─── Anchorer Functions ────────────────────────────────────────────────────

    /**
     * @notice Anchor a new Merkle root for the current scoring epoch.
     * @param merkleRoot   Merkle root of all (identityId, context, score) tuples.
     * @param metadataURI  URI to the full off-chain score dataset for this epoch.
     */
    function anchorRoot(bytes32 merkleRoot, string calldata metadataURI)
        external
        onlyRole(ANCHORER_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(merkleRoot != bytes32(0), "ReputationAnchor: zero root");

        bytes32 prev = latestEpoch > 0
            ? _anchors[latestEpoch].merkleRoot
            : bytes32(0);

        latestEpoch++;

        _anchors[latestEpoch] = AnchorRecord({
            merkleRoot:  merkleRoot,
            epoch:       latestEpoch,
            timestamp:   block.timestamp,
            metadataURI: metadataURI,
            prevRoot:    prev
        });

        emit RootAnchored(latestEpoch, merkleRoot, prev, metadataURI, block.timestamp);
    }

    /**
     * @notice Commit individual score hashes (e.g. keccak256(abi.encodePacked(identityId, context, score))).
     *         Useful for partial anchoring or when full Merkle trees are too large.
     */
    function commitScores(
        uint256[] calldata identityIds,
        string[]  calldata contexts,
        bytes32[] calldata scoreHashes
    )
        external
        onlyRole(ANCHORER_ROLE)
        whenNotPaused
    {
        uint256 len = identityIds.length;
        require(len == contexts.length && len == scoreHashes.length, "ReputationAnchor: length mismatch");

        for (uint256 i = 0; i < len; i++) {
            _scoreCommitments[identityIds[i]][contexts[i]] = scoreHashes[i];
            emit ScoreCommitted(identityIds[i], contexts[i], scoreHashes[i], block.timestamp);
        }
    }

    // ─── Verification ──────────────────────────────────────────────────────────

    /**
     * @notice Verify a reputation score against the latest Merkle root.
     * @param identityId  Identity whose score is being verified.
     * @param context     Reputation context.
     * @param score       Claimed score value (scaled integer, e.g. 1e6 = 1.0).
     * @param proof       Merkle proof (sibling hashes).
     * @return valid       True if proof is valid against the latest root.
     */
    function verifyScore(
        uint256   identityId,
        string calldata context,
        uint256   score,
        bytes32[] calldata proof
    ) external view returns (bool valid) {
        if (latestEpoch == 0) return false;
        bytes32 root = _anchors[latestEpoch].merkleRoot;
        bytes32 leaf = keccak256(abi.encodePacked(identityId, context, score));
        return _verifyMerkleProof(proof, root, leaf);
    }

    /**
     * @notice Verify a score against a specific epoch's root.
     */
    function verifyScoreAtEpoch(
        uint256   identityId,
        string calldata context,
        uint256   score,
        bytes32[] calldata proof,
        uint256   epoch
    ) external view returns (bool valid) {
        require(epoch <= latestEpoch, "ReputationAnchor: epoch in future");
        bytes32 root = _anchors[epoch].merkleRoot;
        bytes32 leaf = keccak256(abi.encodePacked(identityId, context, score));
        return _verifyMerkleProof(proof, root, leaf);
    }

    /**
     * @notice Verify an individual score commitment (non-Merkle path).
     */
    function verifyScoreCommitment(
        uint256 identityId,
        string calldata context,
        uint256 score
    ) external view returns (bool) {
        bytes32 expected = keccak256(abi.encodePacked(identityId, context, score));
        return _scoreCommitments[identityId][context] == expected;
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    function getAnchorRecord(uint256 epoch)
        external
        view
        returns (AnchorRecord memory)
    {
        return _anchors[epoch];
    }

    function getLatestAnchor() external view returns (AnchorRecord memory) {
        return _anchors[latestEpoch];
    }

    function getScoreCommitment(uint256 identityId, string calldata context)
        external
        view
        returns (bytes32)
    {
        return _scoreCommitments[identityId][context];
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Internal – Merkle Proof Verification ──────────────────────────────────

    function _verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            if (computed <= sibling) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }
        return computed == root;
    }
}
