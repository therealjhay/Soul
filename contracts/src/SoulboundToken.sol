// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SoulboundToken
 * @notice Non-transferable ERC-721 tokens representing credentials/achievements.
 *         Transfers are blocked at the contract level — tokens are truly soulbound.
 *         Issuers (ISSUER_ROLE) can mint, revoke, and optionally set expiration.
 */
contract SoulboundToken is ERC721, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    uint256 private _nextTokenId;

    struct TokenMetadata {
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;    // 0 = never expires
        bool revoked;
        string metadataURI;   // Semantic credential metadata
        string context;       // e.g. "defi", "dao", "social", "hiring"
    }

    // tokenId => metadata
    mapping(uint256 => TokenMetadata) private _tokenMetadata;

    // holder => tokenIds
    mapping(address => uint256[]) private _holderTokens;

    // issuer => issued count (for analytics)
    mapping(address => uint256) public issuerIssuedCount;

    // context => tokenIds (for context-specific lookup)
    mapping(string => uint256[]) private _contextTokens;

    // ─── Events ────────────────────────────────────────────────────────────────

    event SBTMinted(
        uint256 indexed tokenId,
        address indexed holder,
        address indexed issuer,
        string context,
        string metadataURI,
        uint256 expiresAt,
        uint256 timestamp
    );

    event SBTRevoked(
        uint256 indexed tokenId,
        address indexed holder,
        address indexed issuer,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string newMetadataURI,
        uint256 timestamp
    );

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) ERC721("SoulboundToken", "SBT") {
        require(admin != address(0), "SBT: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _nextTokenId = 1;
    }

    // ─── Soulbound: block all transfers ───────────────────────────────────────

    /**
     * @dev Override to block all token transfers — tokens are soulbound.
     *      Only minting (from == address(0)) is allowed.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        require(
            from == address(0),
            "SBT: soulbound tokens are non-transferable"
        );
        return from;
    }

    // ─── Issuer Functions ──────────────────────────────────────────────────────

    /**
     * @notice Mint a Soulbound Token to a holder.
     * @param holder        Recipient of the SBT.
     * @param context       Semantic context (e.g. "defi", "dao").
     * @param metadataURI   Off-chain metadata URI.
     * @param expiresAt     Unix timestamp of expiry (0 = never).
     */
    function mint(
        address holder,
        string calldata context,
        string calldata metadataURI,
        uint256 expiresAt
    )
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId)
    {
        require(holder != address(0), "SBT: zero holder");
        require(bytes(context).length > 0, "SBT: empty context");
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "SBT: invalid expiry"
        );

        tokenId = _nextTokenId++;
        _safeMint(holder, tokenId);

        _tokenMetadata[tokenId] = TokenMetadata({
            issuer:      msg.sender,
            issuedAt:    block.timestamp,
            expiresAt:   expiresAt,
            revoked:     false,
            metadataURI: metadataURI,
            context:     context
        });

        _holderTokens[holder].push(tokenId);
        _contextTokens[context].push(tokenId);
        issuerIssuedCount[msg.sender]++;

        emit SBTMinted(
            tokenId,
            holder,
            msg.sender,
            context,
            metadataURI,
            expiresAt,
            block.timestamp
        );
    }

    /**
     * @notice Revoke an SBT. Only the original issuer can revoke.
     */
    function revoke(uint256 tokenId)
        external
        whenNotPaused
        nonReentrant
    {
        TokenMetadata storage meta = _tokenMetadata[tokenId];
        require(meta.issuedAt != 0, "SBT: token does not exist");
        require(!meta.revoked, "SBT: already revoked");
        require(
            msg.sender == meta.issuer || hasRole(ADMIN_ROLE, msg.sender),
            "SBT: not authorized to revoke"
        );

        meta.revoked = true;
        address holder = ownerOf(tokenId);

        emit SBTRevoked(tokenId, holder, msg.sender, block.timestamp);
    }

    /**
     * @notice Update the metadata URI of an SBT (issuer or admin only).
     */
    function updateMetadata(uint256 tokenId, string calldata newMetadataURI)
        external
        whenNotPaused
    {
        TokenMetadata storage meta = _tokenMetadata[tokenId];
        require(meta.issuedAt != 0, "SBT: token does not exist");
        require(
            msg.sender == meta.issuer || hasRole(ADMIN_ROLE, msg.sender),
            "SBT: not authorized"
        );

        meta.metadataURI = newMetadataURI;
        emit MetadataUpdated(tokenId, newMetadataURI, block.timestamp);
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_tokenMetadata[tokenId].issuedAt != 0, "SBT: nonexistent token");
        return _tokenMetadata[tokenId].metadataURI;
    }

    function getTokenMetadata(uint256 tokenId)
        external
        view
        returns (TokenMetadata memory)
    {
        return _tokenMetadata[tokenId];
    }

    function isValid(uint256 tokenId) public view returns (bool) {
        TokenMetadata memory meta = _tokenMetadata[tokenId];
        if (meta.issuedAt == 0 || meta.revoked) return false;
        if (meta.expiresAt != 0 && block.timestamp > meta.expiresAt) return false;
        return true;
    }

    function getHolderTokens(address holder)
        external
        view
        returns (uint256[] memory)
    {
        return _holderTokens[holder];
    }

    function getContextTokens(string calldata context)
        external
        view
        returns (uint256[] memory)
    {
        return _contextTokens[context];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Interface Support ─────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
