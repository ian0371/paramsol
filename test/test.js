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
