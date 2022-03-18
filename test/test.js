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
    epoch = ethers.utils.RLP.encode('0x093a80'); // 604800
    await gp.addParam(0, "istanbul.epoch", false, epoch);
    p = await gp.getParam(0);
    expect(p).to.equal(epoch);
  });
});

describe("setParam", function () {
  let gp;

  beforeEach(async function () {
    const accounts = await hre.ethers.getSigners();
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(accounts[1].address);
    await gp.deployed();
  });

  it("setParam success", async function () {
    before = ethers.utils.RLP.encode('0x093a80'); // 604800
    param = {
      id: 0,
      name: "istanbul.epoch",
      votable: false,
      value: before,
    };
    await gp.addParam(param.id, param.name, param.votable, param.value);

    after = ethers.utils.RLP.encode('0x015180'); // 86400
    await gp.setParam(param.id, after, 300);
    p = await gp.getParam(param.id);
    expect(p).to.equal(before);
    expect(p).to.emit(gp, 'SetParam').withArgs(param.id, param.name, after, 300);

    // mine 512 blocks
    await hre.network.provider.send("hardhat_mine", ["0x200"]);
    p = await gp.getParam(param.id);
    expect(p).to.equal(after);
  });
});
