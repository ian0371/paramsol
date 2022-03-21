const { expect } = require("chai");
const { ethers } = require("hardhat");

function encode(data) {
  let buf;
  if (typeof data == 'string') {
    if (data.startsWith('0x')) { // if data is address
      buf = Buffer.from(data.slice(2), 'hex');
    }
    else {
      buf = Buffer.from(data);
    }
  }
  else if (typeof data == 'number') {
    buf = ethers.utils.hexlify(data);
  }
  else {
    console.log("unsupported data type:", typeof data, data);
    process.exit(1);
  }
  return ethers.utils.RLP.encode(buf).padEnd(66, '0');
}

async function getnow() {
  return parseInt(await hre.network.provider.send("eth_blockNumber"));
}

async function mineMoreBlocks(num) {
  mineblock = '0x' + num.toString(16);
  await hre.network.provider.send("hardhat_mine", [mineblock]);
}

params = [{
  name:    ethers.utils.formatBytes32String("istanbul.epoch"),
  votable: false,
  before:  encode(604800),
  after:   encode(86400),
}, {
  name:    ethers.utils.formatBytes32String("governance.unitprice"),
  votable: false,
  before:  encode('25000000000'),
  after:   encode('750000000000'),
}, {
  name:    ethers.utils.formatBytes32String("reward.ratio"),
  votable: false,
  before:  encode('34/54/12'),
  after:   encode('20/30/50'),
}, {
  name:    ethers.utils.formatBytes32String("governance.governancemode"),
  votable: false,
  before:  encode('single'),
  after:   encode('ballot'),
}, {
  name:    ethers.utils.formatBytes32String("governance.governingnode"),
  votable: false,
  before:  encode('0x52d41ca72af615a1ac3301b0a93efa222ecc7541'),
  after:   encode('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
}, {
  name:    ethers.utils.formatBytes32String("reward.deferredtxfee"),
  votable: false,
  before:  encode('true'),
  after:   encode('false'),
}, {
  name:    ethers.utils.formatBytes32String("reward.mintingamount"),
  votable: false,
  before:  encode('9600000000000000000'),
  after:   encode('12000000000000000000'),
}];

for ([i, param] of params.entries()) {
  param.id = i;
}

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
    param = params[0];
    await gp.addParam(param.id, param.name, false, param.before);
    p = await gp.getParam(0);
    expect(p).to.equal(param.before);
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
    param = params[0];
    await gp.addParam(param.id, param.name, param.votable, param.before);

    now = await getnow();
    await gp.setParam(param.id, param.after, now + 10000);
    p = await gp.getParam(param.id);
    console.log(p);
    expect(p).to.equal(param.before);
    expect(p).to.emit(gp, 'SetParam').withArgs(param.id, param.name, param.after, now + 10000);

    await mineMoreBlocks(10000);
    p = await gp.getParam(param.id);
    expect(p).to.equal(param.after);
  });
});

describe("scheduledChanges", function () {
  let gp;

  beforeEach(async function () {
    const accounts = await hre.ethers.getSigners();
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(accounts[1].address);
    await gp.deployed();
  });

  it("scheduledChanges success", async function () {
    for (param of params) {
      await gp.addParam(param.id, param.name, param.votable, param.before);
    }

    for (param of params) {
      now = await getnow();
      p = await gp.setParam(param.id, param.after, now + 10000);
      expect(p).to.emit(gp, 'SetParam').withArgs(param.id, param.name, after, now + 10000);
    }
    console.log(await hre.network.provider.send("eth_blockNumber"));

    for (param of params) {
      p = await gp.getParam(param.id);
      expect(p).to.equal(param.before);
    }

    p = await gp.scheduledChanges();
    console.log(p);
    expect(p[0]).to.equal(params.length);

    await mineMoreBlocks(await getnow() + 10000);

    for (param of params) {
      p = await gp.getParam(param.id);
      expect(p).to.equal(param.after);
    }

    p = await gp.scheduledChanges();
    expect(p[0]).to.equal(0);
  });
});

describe("addValidator", function () {
  let gp;

  beforeEach(async function () {
    const accounts = await hre.ethers.getSigners();
    const GovParam = await ethers.getContractFactory("GovParam");
    gp = await GovParam.deploy(accounts[1].address);
    await gp.deployed();
  });

  it("addValidator success", async function () {
    for (addr of await hre.ethers.getSigners()) {
      gp.addValidator(addr.address);
    }
    console.log(await gp.getValidators());
  });
});
