// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @notice Stores tamper-proof fingerprints (hashes) of certificates issued by
 *         approved institutions. No personal data is stored on-chain: only a
 *         keccak256 hash of the certificate data (which includes a random salt).
 *
 * Roles
 *  - owner:        deploys the contract, approves / suspends institutions.
 *  - institution:  approved address that can issue and revoke its own certificates.
 *  - anyone:       can verify a certificate hash (read-only, no gas).
 */
contract CertificateRegistry {
    struct Institution {
        string name;
        bool active;
        uint64 addedAt;
    }

    struct Certificate {
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt; // 0 = not revoked
    }

    address public owner;
    uint256 public totalIssued;

    mapping(address => Institution) private _institutions;
    mapping(bytes32 => Certificate) private _certificates;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event InstitutionAdded(address indexed institution, string name);
    event InstitutionSuspended(address indexed institution);
    event CertificateIssued(bytes32 indexed certHash, address indexed issuer, uint64 issuedAt);
    event CertificateRevoked(bytes32 indexed certHash, address indexed issuer, uint64 revokedAt);

    error NotOwner();
    error NotActiveInstitution();
    error NotCertificateIssuer();
    error ZeroAddress();
    error EmptyName();
    error InvalidHash();
    error AlreadyIssued(bytes32 certHash);
    error UnknownCertificate(bytes32 certHash);
    error AlreadyRevoked(bytes32 certHash);
    error EmptyBatch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyInstitution() {
        if (!_institutions[msg.sender].active) revert NotActiveInstitution();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ───────────── Owner ─────────────
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addInstitution(address institution, string calldata name) external onlyOwner {
        if (institution == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        _institutions[institution] = Institution(name, true, uint64(block.timestamp));
        emit InstitutionAdded(institution, name);
    }

    /// @dev Stops new issuance. Existing certificates remain valid.
    function suspendInstitution(address institution) external onlyOwner {
        if (!_institutions[institution].active) revert NotActiveInstitution();
        _institutions[institution].active = false;
        emit InstitutionSuspended(institution);
    }

    // ───────────── Institution ─────────────
    function issueCertificate(bytes32 certHash) external onlyInstitution {
        _issue(certHash);
    }

    function issueBatch(bytes32[] calldata certHashes) external onlyInstitution {
        if (certHashes.length == 0) revert EmptyBatch();
        for (uint256 i = 0; i < certHashes.length; i++) {
            _issue(certHashes[i]);
        }
    }

    function revokeCertificate(bytes32 certHash) external {
        Certificate storage c = _certificates[certHash];
        if (c.issuedAt == 0) revert UnknownCertificate(certHash);
        if (c.issuer != msg.sender) revert NotCertificateIssuer();
        if (c.revokedAt != 0) revert AlreadyRevoked(certHash);
        c.revokedAt = uint64(block.timestamp);
        emit CertificateRevoked(certHash, msg.sender, c.revokedAt);
    }

    // ───────────── Views ─────────────
    function verifyCertificate(bytes32 certHash)
        external
        view
        returns (
            bool exists,
            bool revoked,
            address issuer,
            string memory institutionName,
            uint64 issuedAt,
            uint64 revokedAt
        )
    {
        Certificate memory c = _certificates[certHash];
        exists = c.issuedAt != 0;
        revoked = c.revokedAt != 0;
        issuer = c.issuer;
        institutionName = _institutions[c.issuer].name;
        issuedAt = c.issuedAt;
        revokedAt = c.revokedAt;
    }

    function getInstitution(address institution)
        external
        view
        returns (string memory name, bool active, uint64 addedAt)
    {
        Institution memory i = _institutions[institution];
        return (i.name, i.active, i.addedAt);
    }

    function isInstitution(address institution) external view returns (bool) {
        return _institutions[institution].active;
    }

    // ───────────── Internal ─────────────
    function _issue(bytes32 certHash) private {
        if (certHash == bytes32(0)) revert InvalidHash();
        if (_certificates[certHash].issuedAt != 0) revert AlreadyIssued(certHash);
        _certificates[certHash] = Certificate(msg.sender, uint64(block.timestamp), 0);
        unchecked { totalIssued++; }
        emit CertificateIssued(certHash, msg.sender, uint64(block.timestamp));
    }
}
