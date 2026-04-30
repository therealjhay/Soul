// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AttestationRegistry
 * @notice Records directed, weighted attestations between identities.
 *         Attestations form the edges of the on-chain reputation trust graph.
 *         Rate limiting and SBT-gating reduce Sybil attack surface.
 */
contract AttestationRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Minimum attestation weight (1) and maximum (100)
    uint8 public constant MIN_WEIGHT = 1;
    uint8 public constant MAX_WEIGHT = 100;

    // Rate limit: max attestations per attester per day
    uint256 public maxAttestationsPerDay = 20;

    // Minimum fee to create an attestation (economic friction)
    uint256 public attestationFee;

    uint256 private _nextAttestationId;

    struct Attestation {
        uint256 id;
        uint256 fromIdentityId;
        uint256 toIdentityId;
        uint8   weight;        // 1-100
        string  context;       // e.g. "defi", "dao", "social", "hiring"
        string  metadataURI;   // Off-chain details
        uint256 createdAt;
        uint256 updatedAt;
        bool    revoked;
    }

    // attestationId => Attestation
    mapping(uint256 => Attestation) private _attestations;

    // fromIdentityId => toIdentityId => context => attestationId (latest active)
    mapping(uint256 => mapping(uint256 => mapping(string => uint256))) private _activeAttestation;

    // identityId => outgoing attestation IDs
    mapping(uint256 => uint256[]) private _outgoing;

    // identityId => incoming attestation IDs
    mapping(uint256 => uint256[]) private _incoming;

    // Rate limiting: attester => day bucket => count
    mapping(uint256 => mapping(uint256 => uint256)) private _dailyCount;

    // Treasury to collect fees
    address public treasury;

    // ─── Events ────────────────────────────────────────────────────────────────

    event AttestationCreated(
        uint256 indexed attestationId,
        uint256 indexed fromIdentityId,
        uint256 indexed toIdentityId,
        uint8   weight,
        string  context,
        string  metadataURI,
        uint256 timestamp
    );

    event AttestationUpdated(
        uint256 indexed attestationId,
        uint8   newWeight,
        string  newMetadataURI,
        uint256 timestamp
    );

    event AttestationRevoked(
        uint256 indexed attestationId,
        uint256 indexed fromIdentityId,
        uint256 indexed toIdentityId,
        uint256 timestamp
    );

    event FeeUpdated(uint256 newFee);
    event RateLimitUpdated(uint256 newMax);

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address _treasury) {
        require(admin != address(0), "AttestationRegistry: zero admin");
        require(_treasury != address(0), "AttestationRegistry: zero treasury");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        treasury = _treasury;
        _nextAttestationId = 1;
    }

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier validWeight(uint8 weight) {
        require(
            weight >= MIN_WEIGHT && weight <= MAX_WEIGHT,
            "AttestationRegistry: weight out of range"
        );
        _;
    }

    // ─── Attestation Functions ─────────────────────────────────────────────────

    /**
     * @notice Create a directed attestation from one identity to another.
     * @param fromIdentityId  Attesting identity (must own msg.sender wallet).
     * @param toIdentityId    Attested identity.
     * @param weight          Trust weight 1-100.
     * @param context         Semantic context.
     * @param metadataURI     Off-chain attestation details.
     */
    function attest(
        uint256 fromIdentityId,
        uint256 toIdentityId,
        uint8   weight,
        string calldata context,
        string calldata metadataURI
    )
        external
        payable
        whenNotPaused
        nonReentrant
        validWeight(weight)
        returns (uint256 attestationId)
    {
        require(fromIdentityId != toIdentityId, "AttestationRegistry: self-attestation");
        require(bytes(context).length > 0, "AttestationRegistry: empty context");
        require(
            msg.value >= attestationFee,
            "AttestationRegistry: insufficient fee"
        );

        // Rate limiting
        uint256 dayBucket = block.timestamp / 1 days;
        require(
            _dailyCount[fromIdentityId][dayBucket] < maxAttestationsPerDay,
            "AttestationRegistry: daily rate limit exceeded"
        );

        // Revoke any existing active attestation in the same context
        uint256 existingId = _activeAttestation[fromIdentityId][toIdentityId][context];
        if (existingId != 0 && !_attestations[existingId].revoked) {
            _revokeAttestation(existingId);
        }

        attestationId = _nextAttestationId++;

        _attestations[attestationId] = Attestation({
            id:             attestationId,
            fromIdentityId: fromIdentityId,
            toIdentityId:   toIdentityId,
            weight:         weight,
            context:        context,
            metadataURI:    metadataURI,
            createdAt:      block.timestamp,
            updatedAt:      block.timestamp,
            revoked:        false
        });

        _activeAttestation[fromIdentityId][toIdentityId][context] = attestationId;
        _outgoing[fromIdentityId].push(attestationId);
        _incoming[toIdentityId].push(attestationId);
        _dailyCount[fromIdentityId][dayBucket]++;

        // Forward fee to treasury
        if (msg.value > 0) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "AttestationRegistry: fee transfer failed");
        }

        emit AttestationCreated(
            attestationId,
            fromIdentityId,
            toIdentityId,
            weight,
            context,
            metadataURI,
            block.timestamp
        );
    }

    /**
     * @notice Update the weight or metadata of an existing attestation.
     * @param attestationId  ID of the attestation to update.
     * @param newWeight      New weight value.
     * @param newMetadataURI New metadata URI.
     */
    function updateAttestation(
        uint256 attestationId,
        uint8   newWeight,
        string calldata newMetadataURI
    )
        external
        whenNotPaused
        validWeight(newWeight)
    {
        Attestation storage att = _attestations[attestationId];
        require(att.createdAt != 0, "AttestationRegistry: does not exist");
        require(!att.revoked, "AttestationRegistry: already revoked");

        att.weight      = newWeight;
        att.metadataURI = newMetadataURI;
        att.updatedAt   = block.timestamp;

        emit AttestationUpdated(
            attestationId,
            newWeight,
            newMetadataURI,
            block.timestamp
        );
    }

    /**
     * @notice Revoke an attestation.
     */
    function revokeAttestation(uint256 attestationId)
        external
        whenNotPaused
        nonReentrant
    {
        Attestation storage att = _attestations[attestationId];
        require(att.createdAt != 0, "AttestationRegistry: does not exist");
        require(!att.revoked, "AttestationRegistry: already revoked");

        _revokeAttestation(attestationId);
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _revokeAttestation(uint256 attestationId) internal {
        Attestation storage att = _attestations[attestationId];
        att.revoked    = true;
        att.updatedAt  = block.timestamp;

        delete _activeAttestation[att.fromIdentityId][att.toIdentityId][att.context];

        emit AttestationRevoked(
            attestationId,
            att.fromIdentityId,
            att.toIdentityId,
            block.timestamp
        );
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    function getAttestation(uint256 attestationId)
        external
        view
        returns (Attestation memory)
    {
        return _attestations[attestationId];
    }

    function getActiveAttestation(
        uint256 fromId,
        uint256 toId,
        string calldata context
    ) external view returns (uint256) {
        return _activeAttestation[fromId][toId][context];
    }

    function getOutgoingAttestations(uint256 identityId)
        external
        view
        returns (uint256[] memory)
    {
        return _outgoing[identityId];
    }

    function getIncomingAttestations(uint256 identityId)
        external
        view
        returns (uint256[] memory)
    {
        return _incoming[identityId];
    }

    function getDailyCount(uint256 identityId) external view returns (uint256) {
        return _dailyCount[identityId][block.timestamp / 1 days];
    }

    function totalAttestations() external view returns (uint256) {
        return _nextAttestationId - 1;
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function setAttestationFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        attestationFee = newFee;
        emit FeeUpdated(newFee);
    }

    function setMaxAttestationsPerDay(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0, "AttestationRegistry: zero limit");
        maxAttestationsPerDay = newMax;
        emit RateLimitUpdated(newMax);
    }

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        require(newTreasury != address(0), "AttestationRegistry: zero treasury");
        treasury = newTreasury;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
