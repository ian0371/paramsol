const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("constructor", function () {
  it("Constructor success", async function () {
    const accounts = await hre.ethers.getSigners();
    const GovParam = await ethers.getContractFactory("GovParam");
    const gp = await GovParam.deploy(accounts[1].address);
    await gp.deployed();

    expect(await gp.owner()).to.equal(accounts[1].address);
  });
});

describe("addParam", function () {
  let gp;

  beforeEach(async function () {
    const accounts = await hre.ethers.getSigners();
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(accounts[1].address);
    await gp.deployed();
  });

  it("addParam success", async function () {
    epoch = ethers.utils.RLP.encode('0x093a80');
    await gp.addParam(0, "istanbul.epoch", false, epoch);
    p = await gp.getParam(0);
    expect(p).to.equal(epoch);
  });
});
