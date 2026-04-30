// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SoulboundIdentity
 * @notice Manages on-chain identity anchoring for the Reputational Graph Protocol.
 *         Each address can register exactly one identity, optionally linking multiple
 *         wallets to the same identity and providing off-chain metadata references.
 */
contract SoulboundIdentity is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 private _nextIdentityId;

    struct Identity {
        uint256 id;
        address primaryWallet;
        string metadataURI;       // IPFS / Arweave URI for off-chain metadata
        uint256 createdAt;
        uint256 updatedAt;
        bool active;
    }

    // identityId => Identity
    mapping(uint256 => Identity) private _identities;

    // wallet => identityId (0 if not registered)
    mapping(address => uint256) private _walletToIdentity;

    // identityId => linked wallets
    mapping(uint256 => address[]) private _linkedWallets;

    // identityId => wallet => isLinked
    mapping(uint256 => mapping(address => bool)) private _isLinkedWallet;

    // Recovery: pending recovery requests
    struct RecoveryRequest {
        address newPrimaryWallet;
        uint256 requestedAt;
        bool pending;
    }
    mapping(uint256 => RecoveryRequest) private _recoveryRequests;

    uint256 public constant RECOVERY_DELAY = 2 days;

    // ─── Events ────────────────────────────────────────────────────────────────

    event IdentityRegistered(
        uint256 indexed identityId,
        address indexed wallet,
        string metadataURI,
        uint256 timestamp
    );

    event WalletLinked(
        uint256 indexed identityId,
        address indexed wallet,
        uint256 timestamp
    );

    event WalletUnlinked(
        uint256 indexed identityId,
        address indexed wallet,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed identityId,
        string newMetadataURI,
        uint256 timestamp
    );

    event IdentityDeactivated(uint256 indexed identityId, uint256 timestamp);

    event RecoveryInitiated(
        uint256 indexed identityId,
        address indexed newWallet,
        uint256 timestamp
    );

    event RecoveryCompleted(
        uint256 indexed identityId,
        address indexed oldWallet,
        address indexed newWallet,
        uint256 timestamp
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) {
        require(admin != address(0), "SoulboundIdentity: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _nextIdentityId = 1;
    }

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyIdentityOwner(uint256 identityId) {
        require(
            _isOwnerOf(msg.sender, identityId),
            "SoulboundIdentity: not identity owner"
        );
        _;
    }

    // ─── Public Functions ──────────────────────────────────────────────────────

    /**
     * @notice Register a new identity for the caller.
     * @param metadataURI URI pointing to off-chain identity metadata.
     */
    function registerIdentity(string calldata metadataURI)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 identityId)
    {
        require(
            _walletToIdentity[msg.sender] == 0,
            "SoulboundIdentity: already registered"
        );

        identityId = _nextIdentityId++;

        _identities[identityId] = Identity({
            id: identityId,
            primaryWallet: msg.sender,
            metadataURI: metadataURI,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            active: true
        });

        _walletToIdentity[msg.sender] = identityId;
        _linkedWallets[identityId].push(msg.sender);
        _isLinkedWallet[identityId][msg.sender] = true;

        emit IdentityRegistered(identityId, msg.sender, metadataURI, block.timestamp);
    }

    /**
     * @notice Link an additional wallet to the caller's identity.
     *         The wallet being linked must call this function (it must sign the tx).
     * @param identityId Identity to link to.
     */
    function linkWallet(uint256 identityId)
        external
        whenNotPaused
        nonReentrant
    {
        require(
            _identities[identityId].active,
            "SoulboundIdentity: identity inactive"
        );
        require(
            _walletToIdentity[msg.sender] == 0,
            "SoulboundIdentity: wallet already linked"
        );

        _walletToIdentity[msg.sender] = identityId;
        _linkedWallets[identityId].push(msg.sender);
        _isLinkedWallet[identityId][msg.sender] = true;

        emit WalletLinked(identityId, msg.sender, block.timestamp);
    }

    /**
     * @notice Unlink a non-primary wallet from the caller's identity.
     * @param wallet Wallet to unlink.
     */
    function unlinkWallet(address wallet)
        external
        whenNotPaused
        nonReentrant
    {
        uint256 identityId = _walletToIdentity[msg.sender];
        require(identityId != 0, "SoulboundIdentity: not registered");
        require(
            _isOwnerOf(msg.sender, identityId),
            "SoulboundIdentity: not identity owner"
        );
        require(wallet != _identities[identityId].primaryWallet, "SoulboundIdentity: cannot unlink primary");
        require(
            _isLinkedWallet[identityId][wallet],
            "SoulboundIdentity: wallet not linked"
        );

        _walletToIdentity[wallet] = 0;
        _isLinkedWallet[identityId][wallet] = false;

        // Remove from array
        address[] storage wallets = _linkedWallets[identityId];
        for (uint256 i = 0; i < wallets.length; i++) {
            if (wallets[i] == wallet) {
                wallets[i] = wallets[wallets.length - 1];
                wallets.pop();
                break;
            }
        }

        emit WalletUnlinked(identityId, wallet, block.timestamp);
    }

    /**
     * @notice Update the metadata URI for the caller's identity.
     */
    function updateMetadata(string calldata newMetadataURI)
        external
        whenNotPaused
    {
        uint256 identityId = _walletToIdentity[msg.sender];
        require(identityId != 0, "SoulboundIdentity: not registered");
        require(
            _identities[identityId].active,
            "SoulboundIdentity: identity inactive"
        );
        require(
            _isOwnerOf(msg.sender, identityId),
            "SoulboundIdentity: not identity owner"
        );

        _identities[identityId].metadataURI = newMetadataURI;
        _identities[identityId].updatedAt = block.timestamp;

        emit MetadataUpdated(identityId, newMetadataURI, block.timestamp);
    }

    /**
     * @notice Initiate a wallet recovery (change primary wallet).
     *         After RECOVERY_DELAY, the new wallet can complete recovery.
     */
    function initiateRecovery(address newPrimaryWallet)
        external
        whenNotPaused
    {
        uint256 identityId = _walletToIdentity[msg.sender];
        require(identityId != 0, "SoulboundIdentity: not registered");
        require(
            _isOwnerOf(msg.sender, identityId),
            "SoulboundIdentity: not identity owner"
        );
        require(newPrimaryWallet != address(0), "SoulboundIdentity: zero wallet");
        require(
            _walletToIdentity[newPrimaryWallet] == 0,
            "SoulboundIdentity: new wallet already registered"
        );

        _recoveryRequests[identityId] = RecoveryRequest({
            newPrimaryWallet: newPrimaryWallet,
            requestedAt: block.timestamp,
            pending: true
        });

        emit RecoveryInitiated(identityId, newPrimaryWallet, block.timestamp);
    }

    /**
     * @notice Complete a pending recovery. Must be called by the new wallet
     *         after RECOVERY_DELAY has elapsed.
     */
    function completeRecovery(uint256 identityId) external whenNotPaused nonReentrant {
        RecoveryRequest storage req = _recoveryRequests[identityId];
        require(req.pending, "SoulboundIdentity: no pending recovery");
        require(
            msg.sender == req.newPrimaryWallet,
            "SoulboundIdentity: caller is not new wallet"
        );
        require(
            block.timestamp >= req.requestedAt + RECOVERY_DELAY,
            "SoulboundIdentity: recovery delay not elapsed"
        );

        address oldPrimary = _identities[identityId].primaryWallet;

        // Transfer primary wallet
        _walletToIdentity[req.newPrimaryWallet] = identityId;
        _identities[identityId].primaryWallet = req.newPrimaryWallet;
        _identities[identityId].updatedAt = block.timestamp;

        if (!_isLinkedWallet[identityId][req.newPrimaryWallet]) {
            _linkedWallets[identityId].push(req.newPrimaryWallet);
            _isLinkedWallet[identityId][req.newPrimaryWallet] = true;
        }

        req.pending = false;

        emit RecoveryCompleted(identityId, oldPrimary, req.newPrimaryWallet, block.timestamp);
    }

    /**
     * @notice Admin: deactivate an identity (e.g. for abuse).
     */
    function deactivateIdentity(uint256 identityId)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(
            _identities[identityId].id != 0,
            "SoulboundIdentity: identity does not exist"
        );
        _identities[identityId].active = false;
        emit IdentityDeactivated(identityId, block.timestamp);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    function getIdentity(uint256 identityId)
        external
        view
        returns (Identity memory)
    {
        return _identities[identityId];
    }

    function getIdentityByWallet(address wallet)
        external
        view
        returns (Identity memory)
    {
        uint256 id = _walletToIdentity[wallet];
        return _identities[id];
    }

    function getIdentityId(address wallet) external view returns (uint256) {
        return _walletToIdentity[wallet];
    }

    function getLinkedWallets(uint256 identityId)
        external
        view
        returns (address[] memory)
    {
        return _linkedWallets[identityId];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return _walletToIdentity[wallet] != 0;
    }

    function isActive(uint256 identityId) external view returns (bool) {
        return _identities[identityId].active;
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _isOwnerOf(address wallet, uint256 identityId)
        internal
        view
        returns (bool)
    {
        return _identities[identityId].primaryWallet == wallet;
    }
}
