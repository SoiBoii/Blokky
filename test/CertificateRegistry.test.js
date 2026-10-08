const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", () => {
  let registry, owner, uni, other, employer;
  const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

  beforeEach(async () => {
    [owner, uni, other, employer] = await ethers.getSigners();
    registry = await (await ethers.getContractFactory("CertificateRegistry")).deploy();
    await registry.addInstitution(uni.address, "Demo University");
  });

  it("sets deployer as owner", async () => {
    expect(await registry.owner()).to.equal(owner.address);
  });

  describe("institutions", () => {
    it("only owner can add institutions", async () => {
      await expect(registry.connect(other).addInstitution(other.address, "X"))
        .to.be.revertedWithCustomError(registry, "NotOwner");
    });
    it("rejects zero address and empty name", async () => {
      await expect(registry.addInstitution(ethers.ZeroAddress, "X"))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
      await expect(registry.addInstitution(other.address, ""))
        .to.be.revertedWithCustomError(registry, "EmptyName");
    });
    it("can be suspended, blocking further issuance", async () => {
      await registry.suspendInstitution(uni.address);
      expect(await registry.isInstitution(uni.address)).to.equal(false);
      await expect(registry.connect(uni).issueCertificate(hash("a")))
        .to.be.revertedWithCustomError(registry, "NotActiveInstitution");
    });
  });

  describe("issuing", () => {
    it("lets an approved institution issue and anyone verify", async () => {
      const h = hash("alice|MCA|2026");
      await expect(registry.connect(uni).issueCertificate(h)).to.emit(registry, "CertificateIssued");
      const r = await registry.connect(employer).verifyCertificate(h);
      expect(r.exists).to.equal(true);
      expect(r.revoked).to.equal(false);
      expect(r.issuer).to.equal(uni.address);
      expect(r.institutionName).to.equal("Demo University");
      expect(await registry.totalIssued()).to.equal(1n);
    });
    it("blocks non-institutions", async () => {
      await expect(registry.connect(other).issueCertificate(hash("a")))
        .to.be.revertedWithCustomError(registry, "NotActiveInstitution");
    });
    it("blocks duplicates and zero hash", async () => {
      const h = hash("dup");
      await registry.connect(uni).issueCertificate(h);
      await expect(registry.connect(uni).issueCertificate(h))
        .to.be.revertedWithCustomError(registry, "AlreadyIssued");
      await expect(registry.connect(uni).issueCertificate(ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "InvalidHash");
    });
    it("supports batch issuance", async () => {
      await registry.connect(uni).issueBatch([hash("1"), hash("2"), hash("3")]);
      expect(await registry.totalIssued()).to.equal(3n);
      await expect(registry.connect(uni).issueBatch([]))
        .to.be.revertedWithCustomError(registry, "EmptyBatch");
    });
    it("returns exists=false for unknown hashes", async () => {
      const r = await registry.verifyCertificate(hash("nope"));
      expect(r.exists).to.equal(false);
    });
  });

  describe("revoking", () => {
    it("lets only the original issuer revoke, once", async () => {
      const h = hash("revoke-me");
      await registry.connect(uni).issueCertificate(h);
      await registry.addInstitution(other.address, "Other Uni");
      await expect(registry.connect(other).revokeCertificate(h))
        .to.be.revertedWithCustomError(registry, "NotCertificateIssuer");
      await expect(registry.connect(uni).revokeCertificate(h)).to.emit(registry, "CertificateRevoked");
      const r = await registry.verifyCertificate(h);
      expect(r.revoked).to.equal(true);
      expect(r.revokedAt).to.be.gt(0n);
      await expect(registry.connect(uni).revokeCertificate(h))
        .to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });
    it("reverts for unknown certificates", async () => {
      await expect(registry.connect(uni).revokeCertificate(hash("x")))
        .to.be.revertedWithCustomError(registry, "UnknownCertificate");
    });
  });

  describe("ownership", () => {
    it("transfers ownership", async () => {
      await registry.transferOwnership(other.address);
      expect(await registry.owner()).to.equal(other.address);
      await expect(registry.transferOwnership(owner.address))
        .to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });
});
